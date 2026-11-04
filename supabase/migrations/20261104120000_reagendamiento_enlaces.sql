-- Reagendamiento de horas mediante enlace
--
-- Es aditiva: crea una tabla y dos funciones. No modifica columnas, políticas ni
-- funciones existentes, y /agendar y /confirmar no dependen de nada de esto.
--
-- Cómo funciona:
--   1. Recepción llama a generar_enlace_reagendamiento(cita) desde AureoDent.
--      Devuelve el token UNA sola vez; en la base solo queda su hash (sha256).
--   2. El paciente abre /reagendar/<token> y elige una hora.
--   3. La página llama a confirmar_reagendamiento(hash, inicio), que resuelve todo en
--      una sola transacción: revisa el enlace, vuelve a revisar la hora y mueve la cita.
--
-- La tabla también es el historial: cada enlace guarda de qué hora a qué hora se cambió.

create table if not exists public.reagendamiento_enlaces (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  cita_id uuid not null references public.citas(id) on delete cascade,
  paciente_id uuid references public.pacientes(id) on delete cascade,
  profesional_id uuid not null,            -- auth.users.id, igual que citas.profesional_id

  -- Foto de la cita al generar el enlace. Si recepción la cambia, el enlace deja de valer.
  inicio_original timestamp not null,
  fin_original timestamp not null,
  estado_original text,

  estado text not null default 'activo' check (estado in ('activo', 'usado', 'revocado')),
  expira_en timestamptz not null,
  creado_por uuid,
  created_at timestamptz not null default now(),
  revocado_en timestamptz,

  -- Se llenan cuando el paciente confirma
  usado_en timestamptz,
  inicio_nuevo timestamp,
  fin_nuevo timestamp,
  cita_resultante_id uuid references public.citas(id) on delete set null
);

comment on table public.reagendamiento_enlaces is
  'Enlaces para que el paciente reagende su hora. También es el historial de esos cambios.';

-- Una cita tiene como máximo un enlace activo
create unique index if not exists reagendamiento_enlaces_un_activo_por_cita
  on public.reagendamiento_enlaces (cita_id) where estado = 'activo';
create index if not exists reagendamiento_enlaces_cita_idx
  on public.reagendamiento_enlaces (cita_id);

-- Recepción puede leer el historial. Nadie escribe directo: solo las funciones de abajo.
alter table public.reagendamiento_enlaces enable row level security;
revoke all on table public.reagendamiento_enlaces from anon, authenticated;
grant select on table public.reagendamiento_enlaces to authenticated;

drop policy if exists "Personal autenticado lee enlaces de reagendamiento" on public.reagendamiento_enlaces;
create policy "Personal autenticado lee enlaces de reagendamiento"
  on public.reagendamiento_enlaces for select to authenticated using (true);


-- Paciente ya en la clínica o ya atendido: esa cita no se puede reagendar por enlace
create or replace function public.reagendamiento_cita_en_atencion(p_estado text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(coalesce(p_estado, '')) like 'atend%'
      or lower(coalesce(p_estado, '')) in ('en_espera', 'en sala de espera');
$$;

-- Cita que ya terminó sin atenderse. Igual que hoy en la agenda, no se mueve: se crea una
-- nueva para que la inasistencia o anulación siga contando en reportes e historial.
create or replace function public.reagendamiento_cita_terminada(p_estado text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(coalesce(p_estado, '')) in ('no_asiste', 'no asiste', 'cancelada')
      or lower(coalesce(p_estado, '')) like 'anulado%';
$$;


-- Lo usa recepción (usuario autenticado). Devuelve el token en claro una sola vez.
create or replace function public.generar_enlace_reagendamiento(p_cita_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_cita public.citas%rowtype;
  v_token text;
  v_expira timestamptz := now() + interval '7 days';
  v_reemplazados integer;
begin
  if v_usuario is null then
    return jsonb_build_object('ok', false, 'codigo', 'no_autenticado');
  end if;

  select * into v_cita from public.citas where id = p_cita_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'cita_no_encontrada');
  end if;
  if v_cita.paciente_id is null or v_cita.profesional_id is null then
    return jsonb_build_object('ok', false, 'codigo', 'cita_incompleta');
  end if;
  if public.reagendamiento_cita_en_atencion(v_cita.estado) then
    return jsonb_build_object('ok', false, 'codigo', 'cita_en_atencion');
  end if;

  -- Generar otro enlace invalida el anterior
  update public.reagendamiento_enlaces
     set estado = 'revocado', revocado_en = now()
   where cita_id = p_cita_id and estado = 'activo';
  get diagnostics v_reemplazados = row_count;

  -- 192 bits aleatorios en base64 apto para URL: 32 caracteres
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_');

  insert into public.reagendamiento_enlaces (
    token_hash, cita_id, paciente_id, profesional_id,
    inicio_original, fin_original, estado_original, expira_en, creado_por
  ) values (
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), v_cita.id, v_cita.paciente_id, v_cita.profesional_id,
    v_cita.inicio, v_cita.fin, v_cita.estado, v_expira, v_usuario
  );

  insert into public.auditoria_clinica (usuario_id, accion, tabla, detalles, paciente_id, registro_afectado_id)
  values (
    v_usuario, 'INSERT / ENLACE REAGENDAMIENTO', 'citas',
    format('Generó un enlace de reagendamiento para la cita del %s.', to_char(v_cita.inicio, 'YYYY-MM-DD HH24:MI')),
    v_cita.paciente_id, v_cita.id::text
  );

  return jsonb_build_object('ok', true, 'token', v_token, 'expira_en', v_expira, 'reemplazo_anterior', v_reemplazados > 0);
end;
$$;


-- Lo usa solo el servidor de la página de agendamiento (service_role).
-- Serializa por profesional y día: si dos pacientes piden la misma hora, el segundo recibe 'ocupado'.
create or replace function public.confirmar_reagendamiento(p_token_hash text, p_inicio timestamp)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enlace public.reagendamiento_enlaces%rowtype;
  v_cita public.citas%rowtype;
  v_fin timestamp;
  v_profesional_ficha uuid;
  v_resultante uuid;
  v_web_pendiente boolean;
begin
  select * into v_enlace from public.reagendamiento_enlaces where token_hash = p_token_hash for update;
  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'invalido');
  end if;
  if v_enlace.estado = 'usado' then
    return jsonb_build_object('ok', false, 'codigo', 'usado');
  end if;
  if v_enlace.estado <> 'activo' then
    return jsonb_build_object('ok', false, 'codigo', 'invalido');
  end if;
  if v_enlace.expira_en <= now() then
    return jsonb_build_object('ok', false, 'codigo', 'expirado');
  end if;

  select * into v_cita from public.citas where id = v_enlace.cita_id for update;
  if not found
     or v_cita.inicio <> v_enlace.inicio_original
     or v_cita.fin <> v_enlace.fin_original
     or v_cita.profesional_id is distinct from v_enlace.profesional_id
     or public.reagendamiento_cita_en_atencion(v_cita.estado)
     or (v_cita.estado = 'cancelada' and v_enlace.estado_original is distinct from 'cancelada')
  then
    return jsonb_build_object('ok', false, 'codigo', 'invalido');
  end if;

  if p_inicio <= (now() at time zone 'America/Santiago') then
    return jsonb_build_object('ok', false, 'codigo', 'ocupado');
  end if;

  -- Misma duración, siempre: se calcula de la cita y nunca se recibe del navegador
  v_fin := p_inicio + (v_cita.fin - v_cita.inicio);

  perform pg_advisory_xact_lock(hashtextextended(v_cita.profesional_id::text || ':' || (p_inicio::date)::text, 0));

  -- Se revisa con el candado tomado: aquí se resuelve la carrera entre dos pacientes
  if exists (
    select 1 from public.citas c
     where c.profesional_id = v_cita.profesional_id
       and c.id <> v_cita.id
       and c.estado is distinct from 'cancelada'
       and c.inicio < v_fin and c.fin > p_inicio
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'ocupado');
  end if;

  select id into v_profesional_ficha from public.profesionales where user_id = v_cita.profesional_id;
  if exists (
    select 1 from public.bloqueos_agenda b
     where b.profesional_id = v_profesional_ficha
       and b.fecha = p_inicio::date
       and (b.hora_inicio is null or b.hora_fin is null
            or (b.hora_inicio < v_fin::time and b.hora_fin > p_inicio::time))
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'ocupado');
  end if;

  if exists (
    select 1 from public.citas c
     where c.paciente_id = v_cita.paciente_id
       and c.id <> v_cita.id
       and c.estado is distinct from 'cancelada'
       and c.inicio < v_fin and c.fin > p_inicio
  ) then
    return jsonb_build_object('ok', false, 'codigo', 'paciente_ocupado');
  end if;

  -- Una solicitud web sin validar no ocupa hora en la agenda. Si recepción le mandó el
  -- enlace ya la dio por buena, así que la nueva hora debe quedar ocupada.
  v_web_pendiente := v_cita.estado_confirmacion = 'pendiente' and position('Online' in coalesce(v_cita.motivo, '')) > 0;

  if public.reagendamiento_cita_terminada(v_cita.estado) then
    insert into public.citas (
      paciente_id, profesional_id, inicio, fin, motivo, estado, estado_confirmacion, box_id, presupuesto_id
    ) values (
      v_cita.paciente_id, v_cita.profesional_id, p_inicio, v_fin, v_cita.motivo, 'reprogramada',
      case when v_web_pendiente then 'enviado' else 'pendiente' end, v_cita.box_id, v_cita.presupuesto_id
    ) returning id into v_resultante;
  else
    update public.citas
       set inicio = p_inicio,
           fin = v_fin,
           estado = 'reprogramada',
           estado_confirmacion = case when v_web_pendiente then 'enviado' else estado_confirmacion end
     where id = v_cita.id;
    v_resultante := v_cita.id;
  end if;

  update public.reagendamiento_enlaces
     set estado = 'usado', usado_en = now(), inicio_nuevo = p_inicio, fin_nuevo = v_fin, cita_resultante_id = v_resultante
   where id = v_enlace.id;

  insert into public.auditoria_clinica (
    accion, tabla, detalles, paciente_id, registro_afectado_id, nombre_usuario, datos_anteriores, datos_nuevos
  ) values (
    'UPDATE / REAGENDAMIENTO POR ENLACE', 'citas',
    format('El paciente reagendó su cita del %s para el %s mediante enlace.',
           to_char(v_cita.inicio, 'YYYY-MM-DD HH24:MI'), to_char(p_inicio, 'YYYY-MM-DD HH24:MI')),
    v_cita.paciente_id, v_resultante::text, 'Paciente (enlace)',
    jsonb_build_object('cita_id', v_cita.id, 'inicio', v_cita.inicio, 'fin', v_cita.fin, 'estado', v_cita.estado),
    jsonb_build_object('cita_id', v_resultante, 'inicio', p_inicio, 'fin', v_fin, 'estado', 'reprogramada')
  );

  return jsonb_build_object('ok', true, 'cita_id', v_resultante, 'inicio', p_inicio, 'fin', v_fin);
end;
$$;


-- Permisos: por defecto Postgres deja ejecutar funciones a todos, incluido el rol público.
revoke all on function public.generar_enlace_reagendamiento(uuid) from public, anon, authenticated;
grant execute on function public.generar_enlace_reagendamiento(uuid) to authenticated;

revoke all on function public.confirmar_reagendamiento(text, timestamp) from public, anon, authenticated;
grant execute on function public.confirmar_reagendamiento(text, timestamp) to service_role;
