# Nivora Frontend

React 18 + TypeScript + Vite + Ant Design frontend for Nivora, the finance management
application. See the [repo root README](../README.md) for what the whole product does and the PRD
it's built from.

## Stack

React 18, TypeScript, Vite, Ant Design 5, React Router, TanStack Query, React Hook Form + Zod,
i18next (English + Tamil), Day.js, Axios.

## Environment

Copy `.env.example` to `.env` if you want to override the default. It only has one variable,
`VITE_API_PROXY_TARGET`, and it **only affects `npm run dev`** (the Vite dev server's `/api`
proxy target, default `http://localhost:8080`). The production Docker build doesn't read it at
all - nginx proxies `/api` to the backend container instead (see `nginx.conf`).

## Running

```bash
npm install
npm run dev
```

Opens on `http://localhost:5173`, proxying `/api` to `VITE_API_PROXY_TARGET`. Start the backend
first (see `../backend/README.md`).

## Building

```bash
npm run build    # tsc -b (type-check) then the production Vite build, output in dist/
npm run preview  # serve the dist/ build locally to sanity-check it
```

## Structure

```
src/
  api/        Axios client (access token in memory, httpOnly-cookie refresh, auto-retry on 401),
              shared TypeScript types mirroring the backend DTOs
  auth/       AuthContext (tenant + platform login), route guards
  i18n/       en.json / ta.json (329 keys, parity-checked in CI) + i18next setup
  layout/     Responsive app shell: side nav (tablet/desktop), bottom nav (phone), language toggle
  components/ Shared form pieces (e.g. PenaltyConfigForm, reused at tenant/customer/loan level)
  pages/      One file per screen from PRD 11.1 (Dashboard, Customers, Loans, Dues, Chit Groups,
              Calculator, Users, Notifications, Settings, Reports, Platform Console, auth pages)
  utils/      Indian-grouping currency formatting, localised date formatting
```

Routes are lazy-loaded (`React.lazy` in `App.tsx`) for smaller initial bundles.

## Known frontend-side simplifications

- Bundle size is ~250 KB gzipped on first load after route-level code-splitting, versus the PRD's
  300 KB target - further trimming (e.g. replacing parts of Ant Design) is a follow-up.
- The self-hosted Tamil font (`public/fonts/NotoSansTamil-Regular.ttf`) is the full variable font,
  not yet subsetted down to a smaller WOFF2.
- CUS-7's 90%-quota warning banner isn't wired into the Customers screen yet.
