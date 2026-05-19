# AgentBooks — Claude Code Startprompt

Skriv i Claude Code:

```
Byg AgentBooks — et AI-drevet fakturabehandlingssystem for danske SMB'er.
Vi bruger det eksisterende Next.js 14 + TypeScript + Tailwind CSS setup.
Tilføj Prisma ORM med SQLite (dev) / PostgreSQL (prod via Supabase).
Auth via NextAuth.js. Brug Anthropic Claude API til AI-extraction.

Byg hele applikationen med disse moduler — ét ad gangen, start med databasemodel og auth:

---

## TRIN 1: DATABASE & AUTH

Prisma schema med følgende modeller:

User: id, name, email, role (ADMIN | BOGHOLDER | MEDARBEJDER | REVISOR), prokura (max beløb for godkendelse), companyId, createdAt

Company: id, name, cvr, address, logo, fiscalYearStart, language (DA | EN), darkMode, economicToken, aiAutoLimit, createdAt

Supplier: id, companyId, name, cvr, country, email, phone, iban, swift, paymentTerms, defaultAccountCode, defaultVatCode, createdAt

Invoice: id, companyId, supplierId, invoiceNumber, invoiceDate, dueDate, currency, amountExVat (Float), vatAmount (Float), totalAmount (Float), dkkAmount (Float), exchangeRate (Float), status (RECEIVED | PROCESSING | PENDING_APPROVAL | APPROVED | PAID | REJECTED), paymentMethod, fiCode, periodizationMonths, duplicateWarning, fraudWarning, createdBy, createdAt, updatedAt

InvoiceLine: id, invoiceId, accountCode, vatCode, department, project, costCenter, amount (Float), description

ApprovalRule: id, companyId, minAmount (Float), maxAmount (Float), approverId, level (1 | 2 | 3)

ApprovalRequest: id, invoiceId, approverId, level, status (PENDING | APPROVED | REJECTED), comment, createdAt, respondedAt

AuditLog: id, companyId, userId, invoiceId, action, details, createdAt

Comment: id, invoiceId, userId, content, mentions (String[]), createdAt

Supplier AutoRule: id, companyId, supplierId, accountCode, vatCode, department, project, confidence (Float)

ExpenseReport: id, companyId, userId, amount (Float), currency, dkkAmount (Float), date, category (TRANSPORT | HOTEL | MEALS | OTHER), accountCode, vatCode, status (DRAFT | SUBMITTED | APPROVED | PAID), receiptUrl, createdAt

PurchaseOrder: id, companyId, supplierId, poNumber, totalAmount (Float), status (DRAFT | APPROVED | PARTIAL | RECEIVED | INVOICED), createdAt

POLine: id, poOrderId, description, quantity (Float), unitPrice (Float), accountCode, received (Float)

BudgetEntry: id, companyId, year, accountCode, budgetAmount (Float), actualAmount (Float)

BankTransaction: id, companyId, date, description, amount (Float), matchedInvoiceId, status (UNMATCHED | MATCHED | MANUAL)

NextAuth setup med email/password og roller gemt i User-tabellen.

---

## TRIN 2: LAYOUT & NAVIGATION

Byg app layout med:
- Sidebar til venstre med disse menupunkter og ikoner:
  Dashboard, Fakturaer, Leverandører, Betalinger, Bankafstemning, Rejseafregninger, Indkøbsordrer, Budget, Rapporter, Indstillinger
- Topbar med: søgefelt, notifikationsklokke (badge med antal), brugermenu
- Dark mode support (toggle i indstillinger, gemmes på User)
- Responsivt layout til desktop

Farver: primær blå (#2563EB), success grøn (#16A34A), warning gul (#CA8A04), danger rød (#DC2626)
Afrundede hjørner (rounded-lg), subtle box-shadow på kort

---

## TRIN 3: DASHBOARD

Siden /dashboard med:

4 KPI-kort øverst (grid 4 kolonner):
1. "Fakturaer til behandling" — antal med status RECEIVED eller PROCESSING
2. "Afventer godkendelse" — antal med status PENDING_APPROVAL
3. "Forfaldne betalinger" — sum af dkkAmount på fakturaer der er APPROVED og dueDate < i dag
4. "Auto-rate" — % fakturaer behandlet uden manuel ændring af kontering

Under KPI-kortene (grid 2 kolonner):
- Cashflow-graf (søjlediagram, Recharts): betalinger pr. uge de næste 8 uger (sum af dkkAmount grupperet pr. uge)
- Faktura-volumen (linjegraf, Recharts): antal fakturaer pr. uge de seneste 12 uger

Under graferne (grid 3 kolonner):
- Statusfordeling donut chart (Recharts): fordeling på alle Invoice.status
- Top 5 leverandører: navn + total beløb + antal fakturaer
- Seneste aktivitet: de 10 seneste AuditLog entries med tidsstempel

---

## TRIN 4: FAKTURA-FLOW

### /fakturaer — Fakturaliste
Tabel med kolonner: Leverandør, Fakturanummer, Fakturadato, Forfaldsdato, Beløb (DKK), Status (farvet badge), Handlinger
Søg, filtrer på status/leverandør/datointerval/beløb
Sortering på alle kolonner
Bulk-selektion: vælg flere → godkend/arkivér

### /fakturaer/upload — Upload
Drag-and-drop zone til PDF (enkelt og batch/flere)
Vis uploadprogress pr. fil
Efter upload: kald /api/invoices/extract med PDF

### /api/invoices/extract
POST endpoint der:
1. Modtager PDF som multipart form data
2. Sender PDF til Claude API (claude-opus-4-5) med prompt:
   "Extract all invoice fields from this Danish invoice PDF. Return JSON with:
   supplierName, supplierCvr, invoiceNumber, invoiceDate (YYYY-MM-DD), dueDate (YYYY-MM-DD),
   amountExVat (number), vatAmount (number), totalAmount (number), currency,
   paymentMethod (BANK_TRANSFER | BETALINGSSERVICE | FI_CODE | INVOICE),
   fiCode (string or null), confidence (0-1 for each field as confidenceScores object)"
3. Parser Claude response til JSON
4. Søger efter eksisterende leverandør på CVR eller navn
5. Tjekker for duplikat (samme invoiceNumber + supplierId)
6. Tjekker fraud (beløb > 3x gennemsnit for leverandøren = fraud warning)
7. Gemmer Invoice i DB med status RECEIVED
8. Returnerer invoice med alle felter + confidenceScores

### /fakturaer/[id] — Fakturadetalje
Layout: PDF-preview venstre side (iframe eller react-pdf), formular højre side

Formularfelter (alle redigérbare):
- Leverandør (dropdown + søg, link til opret ny)
- Fakturanummer
- Fakturadato (datepicker)
- Forfaldsdato (datepicker)
- Beløb ex moms
- Moms
- Total inkl. moms
- Valuta (dropdown: DKK, EUR, USD, GBP, SEK, NOK, CHF)
- DKK-beløb (auto-beregnet fra valuta × exchangeRate)
- Vekselkurs
- Betalingsmetode
- FI-kode

Hvert felt med AI-confidence badge:
- Grøn cirkel: confidence > 90%
- Gul cirkel: confidence 70-90%
- Rød cirkel: confidence < 70%

Konteringssektion:
- Konto (dropdown fra kontoplan for virksomheden)
- Momskode (dropdown: DK25, DK0, MOMSFRI, EUVARER, EUYDELSER, EKSPORT, INGEN, IMPORTMOMS)
- Afdeling (dropdown fra dimensioner)
- Projekt (dropdown fra dimensioner)
- Bærer (dropdown fra dimensioner)
- Periodisering: toggle + antal måneder (2-12)

Advarselsbanner hvis duplicateWarning eller fraudWarning = true

Kommentarsektion nedenfor: vis kommentarer, @mentions, tilføj kommentar

Knapper: "Gem kladde", "Send til godkendelse", "Godkend" (hvis bruger har prokura), "Afvis"

### Approval flow
Når faktura sendes til godkendelse:
1. Find relevante ApprovalRules baseret på dkkAmount
2. Opret ApprovalRequest(s) for godkendere på level 1 (og level 2 hvis beløb kræver det)
3. Skift Invoice.status til PENDING_APPROVAL
4. Opret AuditLog entry

Godkender ser fakturaer til godkendelse i sin kø (/fakturaer?filter=mine)
Kan godkende eller afvise med kommentar
Ved afvisning: status → RECEIVED, notifikation til uploader

---

## TRIN 5: LEVERANDØRSTYRING

### /leverandorer
Liste med: Navn, CVR, Land, Email, Antal fakturaer, Total beløb, Handlinger (rediger/arkivér)
Søg og filtrer
Knap "Tilføj leverandør"

### /leverandorer/[id]
Faner: Stamdata | Betalingsinfo | Kontering | Fakturahistorik

Stamdata: navn, CVR, land, adresse, email, telefon, betalingsbetingelser (dage)
Betalingsinfo: bankkontonummer, IBAN, SWIFT/BIC, FI +71 linje
Standard-kontering: konto, momskode, afdeling, projekt (gemmes som SupplierAutoRule)
Fakturahistorik: liste over alle fakturaer fra leverandøren

---

## TRIN 6: BETALINGER

### /betalinger
3 sektioner:
1. "Forfaldne" — fakturaer med dueDate < i dag og status APPROVED
2. "Forfalder om 7 dage" — dueDate between i dag og +7 dage
3. "Forfalder om 30 dage" — dueDate between +7 og +30 dage

Vælg fakturaer med checkbox
Knap "Generer betalingsfil" → download CSV med kolonnerne:
Leverandørnavn, IBAN, SWIFT, Beløb, Valuta, Betalingsreference, Forfaldsdato

Betalingsstatus tracking på hver faktura: Planlagt | Sendt | Bekræftet

Cashflow-graf: sum af betalinger pr. uge de næste 8 uger

---

## TRIN 7: REJSEAFREGNINGER

### /rejseafregninger
Liste over afregninger med status
Knap "Ny afregning"

### /rejseafregninger/ny
Upload kvittering (billede eller PDF)
AI extraction via Claude: beløb, dato, kategori, valuta, beskrivelse
Konteringsstreg: konto, momskode, afdeling, projekt
Samme approval flow som fakturaer
Status: DRAFT → SUBMITTED → APPROVED → PAID

---

## TRIN 8: INDKØBSORDRER

### /indkobsordrer
Liste over PO'er med status
Knap "Opret PO"

### /indkobsordrer/ny
Vælg leverandør
Tilføj linjer: beskrivelse, antal, enhedspris, konto
Total auto-beregnet
Send til godkendelse (samme approval flow)

### /indkobsordrer/[id]
Vis PO-detaljer
Fane "Modtagelse": markér modtagne varer (delvist eller fuldt)
Fane "3-vejs matching": vis tilknyttede fakturaer, sammenlign PO-beløb vs faktura-beløb
Advar hvis afvigelse > 5%

---

## TRIN 9: INDSTILLINGER

### /indstillinger/virksomhed
Navn, CVR, adresse, logo upload, regnskabsår start/slut, sprog, dark mode

### /indstillinger/brugere
Liste over brugere med rolle og prokura
Inviter ny bruger via email
Rediger rolle og prokura (max godkendelsesbeløb)
Ferie/delegering: vælg periode og stedfortræder

### /indstillinger/godkendelsesregler
Opret/rediger ApprovalRules:
- Beløbsinterval (fra-til)
- Godkender (vælg bruger)
- Level (1, 2, 3)

### /indstillinger/kontoplan
Kontoplan hentes IKKE fra en hardcodet liste — den synkroniseres fra kundens eget regnskabssystem.

Integration med e-conomic (primær):
- Kunden indtaster sit Agreement Grant Token under Integrationer
- Knap "Synkronisér kontoplan" kalder e-conomic API og henter alle konti
- Konti gemmes i en Account-tabel i DB: kontonummer, navn, type, aktiv, companyId
- Synkronisering kan køres igen manuelt eller automatisk hver nat

Visning af kontoplan:
- Liste over alle synkroniserede konti (læs-only, ingen manuel redigering)
- Vis sidst synkroniseret tidsstempel
- Knap "Synkronisér nu"
- Advarsel hvis ingen integration er sat op: "Tilslut dit regnskabssystem under Integrationer for at hente din kontoplan"

Alle konto-dropdowns i appen (fakturaer, rejseafregninger, PO'er) henter fra denne synkroniserede liste.
Hvis ingen kontoplan er synkroniseret endnu, vis tom dropdown med besked om at tilslutte regnskabssystem.

### /indstillinger/momskoder
8 danske standard-momskoder (præ-loadet, kan ikke slettes):
DK25 (25%), DK0 (0%), MOMSFRI, EUVARER, EUYDELSER, EKSPORT, INGEN, IMPORTMOMS

### /indstillinger/dimensioner
Faner: Afdelinger | Projekter | Bærere
Opret/rediger/arkivér
Projekter har: navn, start, slut, budget

### /indstillinger/valuta
Liste over valutaer med kurs mod DKK
Manuelle vekselkurser (kan opdateres)
DKK er altid basiskurs = 1

### /indstillinger/integrationer
E-conomic: input til Agreement Grant Token, knap "Test forbindelse", knap "Synkronisér kontoplan"
Email-intake: vis indgående email-adresse info
Bank (Aiia/PSD2): "Kommer snart" placeholder

### /indstillinger/ai
Auto-konteringsgrænse: fakturaer under X kr behandles automatisk
Minimum confidence score for auto-kontering
Læringsmodus toggle

---

## TRIN 10: RAPPORTER

### /rapporter
4 rapporttyper:
1. Kreditorliste: alle leverandører med skyldig saldo (godkendte + ubetalte fakturaer)
2. Betalingsoversigt: betalte fakturaer i valgt periode, summeret
3. Momsrapport: moms pr. momskode pr. periode (til momsangivelse)
4. Kontospecifikation: alle posteringer på valgt konto i valgt periode

Filtrer på periode (fra-til dato)
Eksport til CSV og Excel

---

## API ENDPOINTS DER SKAL BYGGES

POST /api/invoices/extract — AI extraction af PDF
GET/POST /api/invoices — hent liste / opret
GET/PUT /api/invoices/[id] — hent / opdater faktura
POST /api/invoices/[id]/approve — godkend faktura
POST /api/invoices/[id]/reject — afvis faktura
GET/POST /api/suppliers — leverandørliste
GET/PUT /api/suppliers/[id] — enkelt leverandør
POST /api/payments/export — generer betalingsfil CSV
GET/POST /api/expense-reports — rejseafregninger
GET/POST /api/purchase-orders — indkøbsordrer
GET /api/reports/creditors — kreditorliste
GET /api/reports/payments — betalingsoversigt
GET /api/reports/vat — momsrapport
GET /api/reports/account — kontospecifikation
GET/PUT /api/settings/company — virksomhedsindstillinger
GET/POST /api/settings/users — brugere
POST /api/settings/users/invite — inviter bruger
GET/POST /api/settings/approval-rules — godkendelsesregler
POST /api/settings/accounts/sync — synkronisér kontoplan fra e-conomic
GET /api/settings/accounts — hent synkroniseret kontoplan
GET/POST /api/settings/dimensions — dimensioner

---

## ENVIRONMENT VARIABLES DER SKAL SÆTTES

NEXTAUTH_SECRET=
NEXTAUTH_URL=
DATABASE_URL=
ANTHROPIC_API_KEY=
ECONOMIC_APP_SECRET_TOKEN=
POSTMARK_SERVER_TOKEN=

---

Start med TRIN 1 (database schema + Prisma setup + NextAuth).
Når det er done, fortsæt med TRIN 2 (layout), og så videre i rækkefølge til TRIN 10.
Bekræft hvornår hvert trin er færdigt.
```
