import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aMinutos, calcularHorariosDia, construirDias, type Horario, type Intervalo } from './horarios.ts'

const t = (desde: string, hasta: string): Intervalo => ({ inicio: aMinutos(desde), fin: aMinutos(hasta) })
const horas = (lista: Horario[]) => lista.map((h) => h.hora)
const recomendadas = (lista: Horario[]) => lista.filter((h) => h.recomendado).map((h) => h.hora)

const JORNADA = [t('08:30', '19:30')]

test('el caso del problema: con citas a las 08:30 y 14:00 solo ofrece pegarse a ellas', () => {
  const r = calcularHorariosDia({ jornada: JORNADA, duracion: 30, citas: [t('08:30', '09:00'), t('14:00', '14:30')] })
  assert.deepEqual(recomendadas(r), ['09:00', '13:30', '14:30'])
  assert.ok(!horas(r).includes('11:30'), 'no debe partir el hueco por la mitad')
  assert.ok(!horas(r).includes('18:00'), 'no debe alejarse del final de las citas')
})

test('no crea una ventana nueva: con una sola cita en la mañana no ofrece la tarde', () => {
  const r = calcularHorariosDia({ jornada: JORNADA, duracion: 30, citas: [t('08:30', '09:00')] })
  assert.deepEqual(horas(r), ['09:00', '09:15', '09:30'])
  assert.deepEqual(recomendadas(r), ['09:00'])
})

test('la colación no se salta: la tarde no vale si la mañana quedó vacía', () => {
  const r = calcularHorariosDia({
    jornada: JORNADA,
    bloqueos: [t('13:00', '14:00')],
    duracion: 30,
    citas: [t('08:30', '09:00')],
  })
  assert.ok(!horas(r).includes('14:00'))
})

test('la colación no cuenta como hueco: después de una mañana completa se sigue a las 14:00', () => {
  const r = calcularHorariosDia({
    jornada: JORNADA,
    bloqueos: [t('13:00', '14:00')],
    duracion: 30,
    citas: [t('08:30', '13:00')],
  })
  assert.equal(r[0].hora, '14:00')
  assert.equal(r[0].recomendado, true)
})

test('prefiere el calce exacto de un hueco y lo recomienda', () => {
  const r = calcularHorariosDia({ jornada: JORNADA, duracion: 60, citas: [t('08:30', '10:00'), t('11:00', '12:00')] })
  assert.ok(recomendadas(r).includes('10:00'))
})

test('respeta la duración: una atención de 90 min no entra en un hueco de 60', () => {
  const r = calcularHorariosDia({
    jornada: [t('08:30', '13:00')],
    duracion: 90,
    citas: [t('08:30', '10:00'), t('11:00', '12:30')],
  })
  assert.deepEqual(horas(r), [])
})

test('nunca se cruza con citas ni bloqueos', () => {
  const citas = [t('09:00', '09:45'), t('10:30', '11:00'), t('15:00', '16:00')]
  const bloqueos = [t('12:00', '13:00')]
  const r = calcularHorariosDia({ jornada: JORNADA, duracion: 45, citas, bloqueos })
  assert.ok(r.length > 0)
  for (const h of r) {
    const fin = h.inicio + 45
    for (const o of [...citas, ...bloqueos]) assert.ok(fin <= o.inicio || h.inicio >= o.fin, `${h.hora} se cruza`)
    assert.ok(h.inicio >= aMinutos('08:30') && fin <= aMinutos('19:30'))
  }
})

test('día sin citas: abre por el inicio o el final de la jornada, sin marcarlo recomendado', () => {
  const r = calcularHorariosDia({ jornada: JORNADA, duracion: 30, citas: [] })
  assert.deepEqual(horas(r), ['08:30', '19:00'])
  assert.deepEqual(recomendadas(r), [])
})

test('si ninguna hora cumple, ofrece la menos mala y no pierde el día', () => {
  // Solo cabe después de la colación, lejos de la última cita
  const r = calcularHorariosDia({
    jornada: JORNADA,
    bloqueos: [t('13:00', '14:00')],
    duracion: 120,
    citas: [t('08:30', '11:15')],
  })
  assert.ok(r.length >= 1)
  assert.equal(r[0].recomendado, false)
})

test('sobrecupos y citas cruzadas se tratan como un solo bloque', () => {
  const r = calcularHorariosDia({ jornada: JORNADA, duracion: 15, citas: [t('09:00', '10:00'), t('09:30', '10:30')] })
  assert.ok(recomendadas(r).includes('10:30'))
  assert.ok(!horas(r).includes('10:00'))
})

test('hoy no ofrece horas pasadas ni dentro del margen de anticipación', () => {
  const r = calcularHorariosDia({ jornada: JORNADA, duracion: 30, citas: [], minimoInicio: aMinutos('12:10') })
  assert.ok(r.every((h) => h.inicio >= aMinutos('12:10')))
})

test('funciona con horas fuera de la grilla de 15 minutos', () => {
  const r = calcularHorariosDia({ jornada: JORNADA, duracion: 30, citas: [t('08:30', '09:10')] })
  assert.equal(r[0].hora, '09:10')
})

const baseDias = {
  hoy: '2026-11-04', // miércoles
  minutosAhora: aMinutos('11:00'),
  duracion: 30,
  bloqueos: [],
  citasProfesional: [],
  otrasCitasPaciente: [],
  inicioOriginal: '2026-11-20T10:00:00',
  horizonteDias: 7,
}
const lunesAViernes = [1, 2, 3, 4, 5].map((dia_semana) => ({ dia_semana, fecha_especifica: null, hora_inicio: '09:00:00', hora_fin: '18:00:00' }))

test('solo ofrece los días en que el profesional atiende', () => {
  const dias = construirDias({ ...baseDias, disponibilidad: lunesAViernes })
  assert.ok(!dias.some((d) => d.diaNombre === 'Sáb' || d.diaNombre === 'Dom'))
})

test('un horario de fecha específica reemplaza el semanal de ese día', () => {
  const dias = construirDias({
    ...baseDias,
    disponibilidad: [...lunesAViernes, { dia_semana: 4, fecha_especifica: '2026-11-05', hora_inicio: '15:00:00', hora_fin: '16:00:00' }],
  })
  assert.deepEqual(horas(dias.find((d) => d.fecha === '2026-11-05')!.horarios), ['15:00', '15:30'])
})

test('un bloqueo de día completo saca ese día', () => {
  const dias = construirDias({ ...baseDias, disponibilidad: lunesAViernes, bloqueos: [{ fecha: '2026-11-05', hora_inicio: null, hora_fin: null }] })
  assert.ok(!dias.some((d) => d.fecha === '2026-11-05'))
})

test('no ofrece la misma hora que tenía el paciente', () => {
  const dias = construirDias({ ...baseDias, disponibilidad: lunesAViernes, inicioOriginal: '2026-11-05T09:00:00' })
  assert.ok(!horas(dias.find((d) => d.fecha === '2026-11-05')!.horarios).includes('09:00'))
})

test('no ofrece horas que chocan con otra cita del mismo paciente', () => {
  const dias = construirDias({
    ...baseDias,
    disponibilidad: lunesAViernes,
    otrasCitasPaciente: [{ inicio: '2026-11-05T09:00:00', fin: '2026-11-05T10:00:00' }],
  })
  assert.ok(!horas(dias.find((d) => d.fecha === '2026-11-05')!.horarios).includes('09:00'))
})

test('marca como recomendados los días que aprovechan citas existentes', () => {
  const dias = construirDias({
    ...baseDias,
    disponibilidad: lunesAViernes,
    citasProfesional: [{ inicio: '2026-11-06T09:00:00', fin: '2026-11-06T10:00:00' }],
  })
  assert.equal(dias.find((d) => d.fecha === '2026-11-06')!.recomendado, true)
  assert.equal(dias.find((d) => d.fecha === '2026-11-05')!.recomendado, false)
})

test('hoy aplica dos horas de anticipación', () => {
  const dias = construirDias({ ...baseDias, disponibilidad: lunesAViernes })
  const hoy = dias.find((d) => d.fecha === '2026-11-04')!
  assert.ok(hoy.horarios.every((h) => h.inicio >= aMinutos('13:00')))
})
