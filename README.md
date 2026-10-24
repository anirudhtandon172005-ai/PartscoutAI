# PartScout AI — Industrial Replacement & Spare Part Intelligence

A high-fidelity, responsive industrial software prototype engineered for factory maintenance teams, reliability engineers, and technical procurement specialists to discover drop-in replacements, compare technical specifications deterministically, and evaluate supplier availability before line downtime costs escalate.

---

## Technical Stack & Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Bespoke Vanilla CSS Design System with custom industrial tokens (`Space Grotesk`, `Inter`, `JetBrains Mono`, Parchment `#F7F5F0`, Deep Ink `#12161A`, Mineral Teal `#117A65`, and Safety Orange `#D9531E`)
- **3D Digital Twin**: Interactive [Three.js](https://threejs.org/) model of an IEC 60947-5-2 compliant M18 shielded proximity sensor (CAD wireframe mode, exploded assembly view, steel target flag detection simulation, and annotated hotspots)
- **State & Storage**: React Context + browser `localStorage` persistence for active requests, saved components, shift notes, custom quotations, and targeted source registries
- **Icons**: Lucide React engineering iconography

---

## Sourcing Scenario: Bottling Line 4 Emergency

The prototype models an authentic industrial engineering failure:
- **Asset**: Krones Rotary Filler RF-480 HighSpeed (Beverage Bottling Line 4, Apex PackWorks Facility B4)
- **Failed Part**: Balluff `BES 516-325-G-E5-C-S4` (M18 flush inductive proximity sensor, PNP Normally Open, 8mm sensing range, 4-pin M12 connector)
- **Problem**: OEM factory lead time is 4–6 weeks backordered.
- **Identified Candidates**:
  1. **ifm efector `IGT205`** (**96% Match** — Recommended drop-in replacement; 316L stainless housing upgrade for CIP washdown; 14 units in stock at McMaster-Carr)
  2. **Turck `Bi8U-M18-AP6X-H1141`** (**92% Match** — uprox+ Factor 1 all-metal detection; compact 52mm barrel requiring mounting bracket review)
  3. **Pepperl+Fuchs `NBB8-18GM50-E2-V1`** (**88% Match** — Shorter 50mm body; 35mm thread length requiring locknut verification)
  4. **SICK `IME18-08BPSZC0S`** (**84% Match** — Nickel-plated brass standard sensor; IP67 washdown considerations)

---

## Complete Page Directory & Routes

### Public & Account Pages
- `#/` — **Landing Page**: Industrial hero with 3D digital twin, 7-stage discovery workflow, sample comparison preview, and persona cards.
- `#/login` — **Login**: Plant authentication with 1-click persona logins (`Marcus Vance`, `Elena Gomez`, `Sarah Jenkins`).
- `#/signup` — **Sign Up**: Plant engineering account registration.

### Engineering & Procurement Workspace
- `#/app/dashboard` — **User Dashboard**: Plant line status, active line-down alert, saved parts shelf, and shift activity log.
- `#/app/requests/new/machine` — **Request Wizard (Step 1)**: Machine equipment selection or custom asset creation.
- `#/app/requests/new/part` — **Request Wizard (Step 2)**: Part specifications, thread dimensions, quantity, urgency, and tolerance requirements.
- `#/app/requests/new/review` — **Request Wizard (Step 3)**: Parameter audit and search launch.
- `#/app/search/:id` — **Part Search Progress**: 6-stage crawler progress visualizer with pause/resume, error simulation, and live terminal output.
- `#/app/results/:id` — **Search Results**: Multi-criteria filtering (match score, in-stock only, manufacturer), reported prices, lead times, and freshness indicators.
- `#/app/parts/:id` — **Part Details**: Interactive 3D component twin, verified datasheet specs, direct evidence excerpts, and supplier offers.
- `#/app/compare/:id` — **Replacement Comparison**: Side-by-side specification table with `match`, `mismatch`, `review`, and `unknown` status tags, evidence inspection drawer, and prominent interchangeability disclaimer.
- `#/app/availability/:id` — **Availability & Stock**: Aggregated distributor offers, total cost calculation for required quantity, and stale inventory warnings.
- `#/app/saved` — **Saved Parts**: Pinned component library with direct comparison triggers.
- `#/app/history` — **Request History**: Past searches across plant lines with filter and search capabilities.
- `#/app/tracking` — **Part Request Tracking**: Interactive status progression stepper and local shift note timeline.
- `#/app/quotes` — **Quotation Management**: Side-by-side RFQ bid comparison, accept/decline toggles, and add quote modal.
- `#/app/settings` — **Profile & Settings**: Technical unit preferences (Metric ISO vs Imperial), alert thresholds, and persona settings.

### Supplier Ecosystem
- `#/app/suppliers` — **Supplier Directory**: Searchable registry of authorized distributors and surplus stockists.
- `#/app/suppliers/:id` — **Supplier Profile & Handoff**: Operational metrics, public directory contact information, catalog listings, and simulated RFQ contact handoff.

### Admin Suite
- `#/admin/dashboard` — **Admin Overview**: System metrics, crawler health, and catalog extraction rates.
- `#/admin/sources` — **Website Source Management**: Enable, disable, add, and adjust crawl frequencies for targeted domains.
- `#/admin/jobs` — **Collection Monitor**: Background extraction worker queues, duration, retries, and HTTP error logs.
- `#/admin/products` — **Product Master**: Indexed catalog records with parameter breakdowns.
- `#/admin/suppliers` — **Supplier Attribution**: Entity management and partner verification status.
- `#/admin/quality` — **Data Quality & Validation**: Conflict resolver for contradictory catalog specs, stale inventory, and missing attributes.
- `#/admin/users` — **User Management**: Team role controls and plant access assignments.
- `#/admin/settings` — **API & System Settings**: Masked API credentials, rate-limiting sliders, and planned service boundary definitions.

---

## Running the Application Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:5173/` (or the next available port).

### 3. Build for Production
```bash
npm run build
```

---

## Data Honesty & Prototype Disclaimers

1. **Illustrative Data**: All supplier stock levels, pricing figures, lead times, and contact information are realistic engineering illustrations.
2. **Planned Search Integration**: The search crawler is isolated behind a clean service boundary (`src/data/mockData.ts`). Live external web crawlers (such as TinyFish) can be connected without redesigning the interface.
3. **No Unintentional Telemetry**: Contact supplier actions and RFQ submissions operate locally within browser state and never trigger unverified third-party emails or external form posts.
4. **Engineering Certification**: Comparison scores represent algorithmic parameter correlation and do not certify equipment interchangeability. Physical and electrical verification by plant engineers is always required.
