-- ============================================================
-- AgentBooks / WIM — Initial Schema
-- Multi-tenant faktura- og udgiftsstyring
-- ============================================================

-- Aktivér UUID-extension
create extension if not exists "pgcrypto";

-- ============================================================
-- HJÆLPEFUNKTION: Returnerer org-IDs for den aktuelle bruger
-- Bruges i alle RLS-politikker
-- ============================================================
create or replace function get_my_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id
  from organization_members
  where user_id = auth.uid()
$$;

-- ============================================================
-- PROFILES
-- Udvider auth.users med navn og avatar
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "Brugere kan se alle profiles" on profiles
  for select using (true);

create policy "Brugere kan opdatere egen profile" on profiles
  for update using (auth.uid() = id);

-- Auto-opret profile ved signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- ORGANIZATIONS (tenants)
-- ============================================================
create table organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  cvr                 text,
  email               text,
  phone               text,
  address             text,
  postal_code         text,
  city                text,
  country             text default 'DK',
  logo_url            text,
  fiscal_year_start   text default '01-01',    -- MM-DD
  base_currency       text default 'DKK',
  plan                text default 'starter'
                        check (plan in ('starter', 'professional', 'enterprise')),
  plan_expires_at     timestamptz,
  invoice_count_month integer default 0,       -- tæller til Starter-begrænsning
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table organizations enable row level security;

create policy "Medlemmer kan se egen organisation" on organizations
  for select using (id in (select get_my_org_ids()));

create policy "Admins kan opdatere organisation" on organizations
  for update using (
    id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- ORGANIZATION_MEMBERS
-- Kobler brugere til organisationer med roller
-- Roller: admin | accountant (bogholder) | employee (medarbejder) | auditor (revisor)
-- ============================================================
create table organization_members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             text not null default 'employee'
                     check (role in ('admin', 'accountant', 'employee', 'auditor')),
  invited_by       uuid references auth.users(id),
  invited_email    text,
  joined_at        timestamptz default now(),
  created_at       timestamptz default now(),
  unique (organization_id, user_id)
);

alter table organization_members enable row level security;

create policy "Medlemmer kan se andre i samme org" on organization_members
  for select using (organization_id in (select get_my_org_ids()));

create policy "Admins kan administrere medlemmer" on organization_members
  for all using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- SUPPLIERS (leverandører)
-- ============================================================
create table suppliers (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  cvr              text,
  country          text default 'DK',
  email            text,
  phone            text,
  address          text,
  postal_code      text,
  city             text,
  payment_terms    integer default 30,  -- dage
  iban             text,
  bank_reg_no      text,
  bank_account_no  text,
  default_vat_code text,
  default_account_code text,
  status           text default 'active' check (status in ('active', 'inactive')),
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table suppliers enable row level security;

create policy "Medlemmer kan se leverandører" on suppliers
  for select using (organization_id in (select get_my_org_ids()));

create policy "Admin/bogholder kan administrere leverandører" on suppliers
  for all using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'accountant')
    )
  );

-- ============================================================
-- ACCOUNTS (kontoplan)
-- ============================================================
create table accounts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  code             text not null,
  name             text not null,
  type             text not null
                     check (type in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  vat_code         text,
  is_active        boolean default true,
  created_at       timestamptz default now(),
  unique (organization_id, code)
);

alter table accounts enable row level security;

create policy "Medlemmer kan se kontoplan" on accounts
  for select using (organization_id in (select get_my_org_ids()));

create policy "Admin/bogholder kan administrere kontoplan" on accounts
  for all using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'accountant')
    )
  );

-- ============================================================
-- VAT_CODES (momskoder)
-- system_default = true => vises for alle orgs
-- ============================================================
create table vat_codes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id) on delete cascade,  -- null = systemstandard
  code             text not null,
  name             text not null,
  rate             decimal(5,2),         -- null = fritaget / reverse charge
  rate_type        text default 'percent'
                     check (rate_type in ('percent', 'exempt', 'reverse_charge', 'none')),
  description      text,
  is_system        boolean default false,
  created_at       timestamptz default now()
);

alter table vat_codes enable row level security;

create policy "Alle kan se systemets momskoder" on vat_codes
  for select using (is_system = true or organization_id in (select get_my_org_ids()));

create policy "Admin kan administrere org-momskoder" on vat_codes
  for all using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Indsæt standard danske momskoder
insert into vat_codes (code, name, rate, rate_type, description, is_system) values
  ('DK25',       'Dansk moms 25%',       25,   'percent',        'Standard dansk momssats på køb og salg',               true),
  ('DK0',        'Nulmoms',               0,    'percent',        'Nulsats moms — varer og ydelser med 0% moms',          true),
  ('MOMSFRI',    'Momsfri omsætning',     null, 'exempt',         'Momsfritaget omsætning jf. momsloven §13',             true),
  ('EUVARER',    'EU-køb varer',          null, 'reverse_charge', 'Erhvervelse af varer fra andre EU-lande',              true),
  ('EUYDELSER',  'EU-køb ydelser',        null, 'reverse_charge', 'Køb af ydelser fra andre EU-lande (§16)',              true),
  ('EKSPORT',    'Eksport uden moms',      0,    'percent',        'Salg til lande uden for EU — nulsats',                true),
  ('INGEN',      'Ingen moms',            null, 'none',           'Transaktioner uden momsmæssig relevans',               true),
  ('IMPORTMOMS', 'Importmoms',            25,   'percent',        'Moms ved import fra lande uden for EU',                true);

-- ============================================================
-- DEPARTMENTS & PROJECTS (dimensioner)
-- ============================================================
create table departments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  code             text,
  manager_email    text,
  status           text default 'active' check (status in ('active', 'inactive')),
  created_at       timestamptz default now()
);

alter table departments enable row level security;

create policy "Medlemmer kan se afdelinger" on departments
  for select using (organization_id in (select get_my_org_ids()));

create policy "Admin kan administrere afdelinger" on departments
  for all using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create table projects (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  code             text,
  manager_email    text,
  status           text default 'active' check (status in ('active', 'inactive')),
  created_at       timestamptz default now()
);

alter table projects enable row level security;

create policy "Medlemmer kan se projekter" on projects
  for select using (organization_id in (select get_my_org_ids()));

create policy "Admin kan administrere projekter" on projects
  for all using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- APPROVAL_RULES (godkendelsesregler)
-- ============================================================
create table approval_rules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  name             text not null,
  amount_min       decimal(15,2) default 0,
  amount_max       decimal(15,2),           -- null = ubegrænset
  approver_user_id uuid references auth.users(id),
  department_id    uuid references departments(id),
  priority         integer default 0,
  is_active        boolean default true,
  created_at       timestamptz default now()
);

alter table approval_rules enable row level security;

create policy "Admin/bogholder kan se godkendelsesregler" on approval_rules
  for select using (organization_id in (select get_my_org_ids()));

create policy "Admin kan administrere godkendelsesregler" on approval_rules
  for all using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- PURCHASE_ORDERS (indkøbsordrer)
-- ============================================================
create table purchase_orders (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  po_number        text not null,
  supplier_id      uuid references suppliers(id) on delete set null,
  title            text,
  order_date       date not null default current_date,
  expected_delivery date,
  department_id    uuid references departments(id),
  project_id       uuid references projects(id),
  currency         text default 'DKK',
  total_amount     decimal(15,2) default 0,
  status           text default 'open'
                     check (status in ('draft', 'open', 'partially_received', 'received', 'cancelled')),
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (organization_id, po_number)
);

create table purchase_order_lines (
  id                  uuid primary key default gen_random_uuid(),
  purchase_order_id   uuid not null references purchase_orders(id) on delete cascade,
  description         text not null,
  quantity            decimal(10,3) not null default 1,
  unit_price          decimal(15,2) not null default 0,
  received_quantity   decimal(10,3) default 0,
  account_id          uuid references accounts(id),
  vat_code_id         uuid references vat_codes(id),
  line_total          decimal(15,2) generated always as (quantity * unit_price) stored,
  sort_order          integer default 0
);

alter table purchase_orders enable row level security;
alter table purchase_order_lines enable row level security;

create policy "Medlemmer kan se indkøbsordrer" on purchase_orders
  for select using (organization_id in (select get_my_org_ids()));

create policy "Admin/bogholder kan administrere indkøbsordrer" on purchase_orders
  for all using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'accountant')
    )
  );

create policy "Linjer følger ordre-adgang" on purchase_order_lines
  for select using (
    purchase_order_id in (select id from purchase_orders where organization_id in (select get_my_org_ids()))
  );

create policy "Admin/bogholder kan administrere ordrelinjer" on purchase_order_lines
  for all using (
    purchase_order_id in (
      select po.id from purchase_orders po
      join organization_members om on om.organization_id = po.organization_id
      where om.user_id = auth.uid() and om.role in ('admin', 'accountant')
    )
  );

-- ============================================================
-- INVOICES (fakturaer)
-- ============================================================
create table invoices (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  invoice_number      text,
  supplier_id         uuid references suppliers(id) on delete set null,
  purchase_order_id   uuid references purchase_orders(id) on delete set null,

  -- Datoer
  invoice_date        date,
  due_date            date,

  -- Beløb
  amount_excl_vat     decimal(15,2),
  vat_amount          decimal(15,2),
  amount_incl_vat     decimal(15,2),
  currency            text default 'DKK',

  -- Status
  status              text default 'pending'
                        check (status in (
                          'pending',           -- uploadet, afventer behandling
                          'awaiting_approval', -- sendt til godkendelse
                          'approved',          -- godkendt
                          'rejected',          -- afvist
                          'paid',              -- betalt
                          'overdue',           -- forfalden
                          'cancelled'          -- annulleret
                        )),

  -- Fil (Supabase Storage)
  file_url            text,
  file_name           text,
  file_type           text check (file_type in ('pdf', 'png', 'jpg', 'jpeg')),
  file_size_bytes     integer,

  -- AI-scanning
  ai_scanned          boolean default false,
  ai_data             jsonb,             -- rå AI-ekstraktionsresultat
  ai_confidence       decimal(3,2),      -- 0.00–1.00

  -- Godkendelse
  approved_by         uuid references auth.users(id),
  approved_at         timestamptz,
  rejection_reason    text,

  -- Bogføring
  account_id          uuid references accounts(id),
  vat_code_id         uuid references vat_codes(id),
  department_id       uuid references departments(id),
  project_id          uuid references projects(id),

  -- Meta
  notes               text,
  created_by          uuid references auth.users(id),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table invoice_line_items (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references invoices(id) on delete cascade,
  description     text not null,
  quantity        decimal(10,3) default 1,
  unit_price      decimal(15,2),
  vat_rate        decimal(5,2),
  vat_amount      decimal(15,2),
  line_total      decimal(15,2),
  account_id      uuid references accounts(id),
  vat_code_id     uuid references vat_codes(id),
  sort_order      integer default 0
);

alter table invoices enable row level security;
alter table invoice_line_items enable row level security;

create policy "Alle medlemmer kan se fakturaer" on invoices
  for select using (organization_id in (select get_my_org_ids()));

create policy "Medarbejder kan oprette fakturaer" on invoices
  for insert with check (organization_id in (select get_my_org_ids()));

create policy "Admin/bogholder kan opdatere fakturaer" on invoices
  for update using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'accountant')
    )
  );

create policy "Admin kan slette fakturaer" on invoices
  for delete using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Linjer følger faktura-adgang" on invoice_line_items
  for select using (
    invoice_id in (select id from invoices where organization_id in (select get_my_org_ids()))
  );

create policy "Admin/bogholder kan administrere faktura-linjer" on invoice_line_items
  for all using (
    invoice_id in (
      select i.id from invoices i
      join organization_members om on om.organization_id = i.organization_id
      where om.user_id = auth.uid() and om.role in ('admin', 'accountant')
    )
  );

-- ============================================================
-- PAYMENTS (betalinger)
-- ============================================================
create table payments (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  invoice_id       uuid not null references invoices(id) on delete cascade,
  payment_date     date,
  amount           decimal(15,2) not null,
  currency         text default 'DKK',
  payment_method   text check (payment_method in ('bank_transfer', 'card', 'cash', 'other')),
  reference        text,
  status           text default 'pending'
                     check (status in ('pending', 'completed', 'failed', 'cancelled')),
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz default now()
);

alter table payments enable row level security;

create policy "Alle medlemmer kan se betalinger" on payments
  for select using (organization_id in (select get_my_org_ids()));

create policy "Admin/bogholder kan administrere betalinger" on payments
  for all using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'accountant')
    )
  );

-- ============================================================
-- EXPENSE_REPORTS (rejseafregning)
-- ============================================================
create table expense_reports (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  title            text not null,
  user_id          uuid not null references auth.users(id),
  trip_name        text,
  report_date      date not null default current_date,
  department_id    uuid references departments(id),
  project_id       uuid references projects(id),
  total_amount     decimal(15,2) default 0,
  currency         text default 'DKK',
  status           text default 'draft'
                     check (status in ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  approved_by      uuid references auth.users(id),
  approved_at      timestamptz,
  rejection_reason text,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table expense_items (
  id                uuid primary key default gen_random_uuid(),
  expense_report_id uuid not null references expense_reports(id) on delete cascade,
  description       text not null,
  date              date not null,
  amount            decimal(15,2) not null,
  currency          text default 'DKK',
  category          text check (category in ('transport', 'hotel', 'meals', 'other')),
  receipt_url       text,
  vat_amount        decimal(15,2),
  account_id        uuid references accounts(id),
  sort_order        integer default 0
);

alter table expense_reports enable row level security;
alter table expense_items enable row level security;

create policy "Medarbejdere ser egne + admin/bogholder ser alle" on expense_reports
  for select using (
    organization_id in (select get_my_org_ids())
    and (
      user_id = auth.uid()
      or organization_id in (
        select organization_id from organization_members
        where user_id = auth.uid() and role in ('admin', 'accountant')
      )
    )
  );

create policy "Medarbejdere kan oprette egne rejseafregninger" on expense_reports
  for insert with check (
    organization_id in (select get_my_org_ids())
    and user_id = auth.uid()
  );

create policy "Medarbejdere kan opdatere egne draft-afregninger" on expense_reports
  for update using (
    user_id = auth.uid() and status = 'draft'
  );

create policy "Admin/bogholder kan opdatere alle afregninger" on expense_reports
  for update using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'accountant')
    )
  );

create policy "Udgiftsposter følger afregnings-adgang" on expense_items
  for select using (
    expense_report_id in (select id from expense_reports where organization_id in (select get_my_org_ids()))
  );

create policy "Admin/bogholder kan administrere udgiftsposter" on expense_items
  for all using (
    expense_report_id in (
      select er.id from expense_reports er
      join organization_members om on om.organization_id = er.organization_id
      where om.user_id = auth.uid() and om.role in ('admin', 'accountant')
    )
  );

-- ============================================================
-- INTEGRATIONS (ERP-integrationer)
-- ============================================================
create table integrations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  type             text not null check (type in ('billy', 'economic', 'dinero', 'uniconta')),
  is_active        boolean default false,
  api_key          text,                  -- krypteres i applikationslaget
  api_key_2        text,                  -- sekundær nøgle (fx Agreement Grant Token)
  settings         jsonb default '{}',
  last_sync_at     timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (organization_id, type)
);

alter table integrations enable row level security;

create policy "Admin kan se og administrere integrationer" on integrations
  for all using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- AUDIT_LOG
-- Sporer alle vigtige handlinger i systemet
-- ============================================================
create table audit_log (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  user_id          uuid references auth.users(id),
  action           text not null,   -- fx 'invoice.created', 'invoice.approved'
  resource_type    text not null,   -- fx 'invoice', 'supplier'
  resource_id      uuid,
  old_data         jsonb,
  new_data         jsonb,
  ip_address       text,
  created_at       timestamptz default now()
);

alter table audit_log enable row level security;

create policy "Admin/bogholder kan se audit log" on audit_log
  for select using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'accountant')
    )
  );

create policy "Systemet kan indsætte i audit log" on audit_log
  for insert with check (organization_id in (select get_my_org_ids()));

-- ============================================================
-- INDEKSER for performance
-- ============================================================
create index idx_org_members_user_id     on organization_members(user_id);
create index idx_org_members_org_id      on organization_members(organization_id);
create index idx_invoices_org_id         on invoices(organization_id);
create index idx_invoices_status         on invoices(status);
create index idx_invoices_due_date       on invoices(due_date);
create index idx_invoices_supplier_id    on invoices(supplier_id);
create index idx_suppliers_org_id        on suppliers(organization_id);
create index idx_payments_org_id         on payments(organization_id);
create index idx_purchase_orders_org_id  on purchase_orders(organization_id);
create index idx_expense_reports_org_id  on expense_reports(organization_id);
create index idx_expense_reports_user_id on expense_reports(user_id);
create index idx_audit_log_org_id        on audit_log(organization_id);
create index idx_audit_log_created_at    on audit_log(created_at desc);

-- ============================================================
-- UPDATED_AT trigger (automatisk opdatering af updated_at)
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at     before update on organizations     for each row execute procedure set_updated_at();
create trigger trg_suppliers_updated_at         before update on suppliers         for each row execute procedure set_updated_at();
create trigger trg_purchase_orders_updated_at   before update on purchase_orders   for each row execute procedure set_updated_at();
create trigger trg_invoices_updated_at          before update on invoices          for each row execute procedure set_updated_at();
create trigger trg_expense_reports_updated_at   before update on expense_reports   for each row execute procedure set_updated_at();
create trigger trg_integrations_updated_at      before update on integrations      for each row execute procedure set_updated_at();
create trigger trg_profiles_updated_at          before update on profiles          for each row execute procedure set_updated_at();
