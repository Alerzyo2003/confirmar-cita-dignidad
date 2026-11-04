This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Reagendamiento por enlace

Recepción genera un enlace desde AureoDent y el paciente elige su nueva hora en `/reagendar/<token>`,
con el mismo profesional, motivo y duración.

- `lib/reagendamiento/horarios.ts`: reglas para mantener la agenda compacta (funciones puras).
- `lib/reagendamiento/servidor.ts` y `app/api/reagendar/[token]`: datos y confirmación.
- `supabase/migrations/20261104120000_reagendamiento_enlaces.sql`: tabla e historial, más las funciones
  `generar_enlace_reagendamiento` y `confirmar_reagendamiento`. Debe aplicarse antes de publicar el código.

Pruebas de la lógica de horarios: `npm test`.
