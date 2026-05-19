@AGENTS.md

# AgentBooks / WIM — Agent Instructions

## Hvad er dette system?
AgentBooks er en **multi-tenant SaaS-platform** til fakturaflow og udgiftsstyring (WIM — Workflow Invoice Management). Mange virksomheder bruger samme platform, men ser kun deres egne data.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database + Auth**: Supabase (Postgres + RLS + Storage)
- **Hosting**: Vercel
- **Sprog i UI**: Dansk

## Mappestruktur (App Router)
```
app/
  (auth)/               # Login, signup, glemt adgangskode
    login/
    signup/
  (app)/                # Beskyttede sider (kræver login + org)
    dashboard/
    fakturaer/
    leverandoerer/
    indkoebsordrer/
    betalinger/
    rejseafregning/
    indstillinger/
    brugere/
  api/                  # API routes (server actions foretrækkes)

components/
  ui/                   # shadcn/ui komponenter (rør ikke disse)
  layout/               # Sidebar, header, navigation
  fakturaer/            # Faktura-specifikke komponenter
  leverandoerer/        # Leverandør-specifikke komponenter
  ... (modul-specifikt)

lib/
  supabase/
    client.ts           # Browser-side Supabase client
    server.ts           # Server-side Supabase client (cookies)
    middleware.ts        # Auth middleware
  utils.ts              # Generelle hjælpefunktioner
  types.ts              # Database-typer (genereret fra Supabase)

supabase/
  migrations/           # SQL migrations — kør i rækkefølge
```

## Multi-tenancy — VIGTIGT
- **Hver virksomhed er en `organization`** med et unikt ID
- **Brugere tilhører organisationer** via `organization_members`-tabellen
- **RLS (Row Level Security)** i Supabase sikrer dataisolation — data filtreres automatisk på `organization_id`
- **Aktiv organisation gemmes i session/cookie** — hent den med `getActiveOrganization()`
- **Tilføj ALDRIG `organization_id` manuelt i queries** — RLS klarer det
- En bruger kan have adgang til flere organisationer (men kun én aktiv ad gangen)

## Roller og adgang
| Rolle       | Dansk        | Kan                                              |
|-------------|--------------|--------------------------------------------------|
| admin       | Admin        | Alt — fuld adgang                                |
| accountant  | Bogholder    | Fakturaer, betalinger, leverandører, afstemning  |
| employee    | Medarbejder  | Upload fakturaer, oprette rejseafregninger       |
| auditor     | Revisor      | Læse alt, ingen skrivning                        |

Check roller i komponenter med `useUserRole()` hook.

## Supabase-konventioner
```typescript
// Server component / server action
import { createServerClient } from '@/lib/supabase/server'
const supabase = await createServerClient()
const { data, error } = await supabase.from('invoices').select('*')

// Client component
import { createBrowserClient } from '@/lib/supabase/client'
const supabase = createBrowserClient()
```

Brug **Server Components og Server Actions** som standard. Brug kun Client Components (`'use client'`) når det er nødvendigt for interaktivitet.

## Database-tabeller
- `profiles` — brugernavne og avatarer (extends auth.users)
- `organizations` — virksomheder (tenants)
- `organization_members` — bruger ↔ org, med rolle
- `suppliers` — leverandører per org
- `accounts` — kontoplan per org
- `vat_codes` — momskoder (system + org-specifikke)
- `departments` — afdelinger (dimension)
- `projects` — projekter (dimension)
- `approval_rules` — godkendelsesregler per org
- `purchase_orders` + `purchase_order_lines` — indkøbsordrer
- `invoices` + `invoice_line_items` — fakturaer
- `payments` — betalinger
- `expense_reports` + `expense_items` — rejseafregninger
- `integrations` — ERP-integrationer (Billy, e-conomic)
- `audit_log` — sporingslog

## Faktura-statusflow
```
pending → awaiting_approval → approved → paid
                           ↘ rejected
pending → cancelled
approved → overdue (automatisk ved forfaldsdato)
```

## UI-regler
- Brug **shadcn/ui** til alle UI-komponenter (Button, Table, Dialog, Form, etc.)
- Sidebar navigation matcher: Dashboard, Fakturaer, Leverandører, Indkøbsordrer, Betalinger, Rejseafregning, Indstillinger, Brugere
- Farver: primær grøn `#10B981` (emerald-500), mørk sidebar `#1a1f2e`
- Alle tekster, labels og UI-strenge er på **dansk**
- Brug `decimal(15,2)` til beløb — vis altid med dansk formatering (f.eks. `1.234,56 kr.`)
- Datoformat: `dd.mm.yyyy` (dansk)

## Vigtige regler
1. **Brug aldrig `any` i TypeScript** — importer typer fra `@/lib/types.ts`
2. **Brug Server Actions** til formularindsendelse — ikke API routes
3. **Valider altid input** på serversiden med Zod
4. **Log altid vigtige handlinger** til `audit_log`-tabellen
5. **Kryptér API-nøgler** til integrationer inden de gemmes i databasen
6. **Abonnementsbegrænsninger**: Starter-plan må max 50 fakturaer/måned og har ingen AI-scanning
7. **Filupload** gemmes i Supabase Storage i bucket `invoices/{org_id}/{invoice_id}`

## Abonnementsplaner
| Plan         | Pris          | Fakturaer    | Brugere | AI-scanning | ERP |
|--------------|---------------|--------------|---------|-------------|-----|
| starter      | 0 kr/md       | Max 50/md    | 1       | Nej         | Nej |
| professional | 299 kr/md     | Ubegrænset   | Op til 5| Ja          | Billy + e-conomic |
| enterprise   | Kontakt os    | Ubegrænset   | Ubegr.  | Ja          | Alle |

## ERP-integrationer
- **Billy by Shine**: Synkroniser fakturaer og bogføring
- **e-conomic**: To-vejs synkronisering af kontoplan, leverandører og fakturaer
- API-nøgler krypteres med AES-256 inden de gemmes i `integrations.api_key`

## Opsætning til ny udvikler
1. `npm install`
2. Kopiér `.env.local.example` til `.env.local` og udfyld Supabase-nøgler
3. Kør `supabase/migrations/001_initial_schema.sql` i Supabase SQL Editor
4. `npm run dev` → http://localhost:3000
