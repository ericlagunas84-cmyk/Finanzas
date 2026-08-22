# App Finanzas MX — Emerald Finance

PWA de finanzas personales para el mercado mexicano: deudas y estrategias de
pago (Bola de Nieve / Avalancha), Meses Sin Intereses, recibos (OCR + XML del
SAT) y servicios recurrentes, con calendario de vencimientos y alertas
anti-mora.

Stack: **Next.js 14 (App Router) · React · Tailwind CSS · Supabase
(Postgres, Auth, Storage)**.

## 1. Requisitos

- Node.js 18.18+
- Una cuenta y proyecto de [Supabase](https://supabase.com)
- Una API key de [Anthropic](https://console.anthropic.com) (usada por el
  escáner OCR de tickets)

## 2. Instalación

```bash
npm install
cp .env.example .env.local
```

Completa `.env.local` con:

| Variable | Dónde obtenerla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en desarrollo |

**Nunca subas `.env.local` a GitHub** — ya está en `.gitignore`.

## 3. Base de datos

El esquema completo (usuarios, cuentas/tarjetas, deudas, compras MSI,
transacciones, recibos, servicios recurrentes, alertas, RLS por usuario)
vive como migración en:

```
supabase/migrations/00000000000000_esquema_inicial.sql
```

Para aplicarlo con la CLI de Supabase:

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>
npx supabase db push
```

También necesitas crear un bucket de Storage llamado `recibos` (Supabase →
Storage → New bucket) para las fotos de tickets que sube el escáner OCR.

Después de correr la migración, genera los tipos de TypeScript de tu base:

```bash
npx supabase gen types typescript --project-id <tu-project-ref> > types/database.types.ts
```

## 4. Correr en local

```bash
npm run dev
```

Abre `http://localhost:3000`.

## 5. Estructura del proyecto

```
app/
├── (auth)/login/          → LoginScreen (email/contraseña, Google, Apple)
├── (app)/
│   ├── dashboard/         → Módulo 1: resumen "gastable" + próximos pagos
│   ├── deudas/            → Módulo 2: Bola de Nieve / Avalancha
│   ├── recibos/           → Módulo 3: escáner OCR de tickets
│   ├── calendario/        → Módulo 4: agenda de vencimientos + alertas
│   └── educacion/         → Módulo 5: CETES vs. deuda (pendiente)
├── api/
│   ├── recibos/ocr/       → recibe la foto, sube a Storage, extrae datos
│   └── deudas/simular/    → (pendiente) endpoint HTTP sobre el motor de simulación
components/
├── auth/ dashboard/ deudas/ recibos/ calendario/ ui/
lib/
├── supabase/              → clientes browser/server
├── finanzas/              → motor de simulación de deudas
├── alertas/               → cálculo del calendario financiero unificado
└── sat/                   → (pendiente) parser de XML del SAT
supabase/migrations/       → esquema SQL versionado
```

## 6. Sistema de diseño — "Emerald Finance"

Todos los componentes usan los mismos tokens definidos en
`tailwind.config.ts` (colores `primary`/`secondary`/`tertiary` con sus
variantes `on-*` y `*-container` estilo Material 3, tipografía Hanken
Grotesk + JetBrains Mono para montos, e íconos Material Symbols Outlined).
Las fuentes y el ícono se cargan **una sola vez** en `app/layout.tsx` — no
hace falta repetir los `<link>` por pantalla.

## 7. Qué falta por construir

Estos módulos se dejaron fuera de este primer entregable a propósito
(carpetas con `.gitkeep` como recordatorio):

- **`lib/sat/`** — parser de CFDI (XML del SAT).
- **`app/(app)/educacion/`** — comparativa CETES/Sofipo vs. pagar deuda.
- **`app/api/deudas/simular/`** — wrapper HTTP sobre
  `lib/finanzas/simuladorDeudas.ts` (hoy el motor ya funciona y está
  probado, solo falta exponerlo como endpoint).
- **`components/ui/`** — primitivos compartidos (Button, Card, Sheet) si
  se quiere dejar de repetir clases de Tailwind entre pantallas.
- Integración real de Open Banking (Belvo/Fintoc) — mencionada en el brief
  original como fase futura.

## 8. Subir a GitHub

```bash
git init
git add .
git commit -m "Setup inicial: esquema, auth, dashboard, deudas, recibos, calendario"
git branch -M main
git remote add origin <url-de-tu-repo>
git push -u origin main
```

`.gitignore` ya excluye `node_modules`, `.next` y cualquier archivo `.env*`.
