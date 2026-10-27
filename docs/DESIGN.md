# UI/UX Design System & Interface Specifications
## ClinIQ: Frontend Design System & User Experience

---

## 1. Design Philosophy & Aesthetic Principles

ClinIQ is built with a **Clinical Calm & High-Efficiency** aesthetic designed specifically for medical environments:
* **Distraction-Free Focus:** High clarity, minimal clutter, and clear visual hierarchy to prevent cognitive overload during fast-paced consultations.
* **Instant Visual Feedback:** Live audio level meters, dynamic pulse indicators during active AI reasoning, and clear color-coded confidence badges.
* **Ergonomic Typography:** Optimized for rapid scannability of medical text, medications, and dosage values.

---

## 2. Design Tokens & Color Palette

```scss
// Primary Clinical Palette
$primary-50:  #eef2ff;
$primary-100: #e0e7ff;
$primary-500: #6366f1; // Indigo Primary Brand
$primary-600: #4f46e5;
$primary-700: #4338ca;

// Medical Teal Accents (Health & Safety)
$teal-50:     #f0fdfa;
$teal-500:    #14b8a6;
$teal-600:    #0d9488;
$teal-700:    #0f766e;

// Clinical Alert & Status Colors
$danger-500:  #ef4444; // Red Flag Alerts & High Urgency
$warning-500: #f59e0b; // Moderate Urgency / In Review
$success-500: #10b981; // Confirmed Diagnosis / Signed Report
$info-500:    #3b82f6; // Informational Guidance

// Neutral & Dark Mode Grayscale
$slate-50:    #f8fafc;
$slate-100:   #f1f5f9;
$slate-200:   #e2e8f0;
$slate-500:   #64748b;
$slate-800:   #1e293b;
$slate-900:   #0f172a;
```

---

## 3. Typography & Hierarchy

* **Primary Font Family:** `'Inter', system-ui, -apple-system, sans-serif`
* **Monospace Font (for Timers & Medical Codes):** `'JetBrains Mono', 'Fira Code', monospace`

| Level | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display 1** | 2rem (32px) | Bold (700) | 1.2 | Main Portal Headers, Hero Statistics |
| **Heading 2** | 1.5rem (24px) | SemiBold (600) | 1.3 | Panel Titles (e.g. SOAP Note, Live DDx) |
| **Heading 3** | 1.125rem (18px) | Medium (500) | 1.4 | Section Sub-headers, Patient Card Titles |
| **Body Large** | 1rem (16px) | Regular (400) | 1.5 | Transcript Dialogue, Clinical Explanations |
| **Body Small** | 0.875rem (14px) | Regular (400) | 1.4 | Metadata, Timestamps, Guideline References |
| **Micro Text** | 0.75rem (12px) | Medium (500) | 1.2 | Badges, Status Pills, Tooltips |

---

## 4. Key Interface Layouts & Components

### 4.1 Doctor Consultation Workspace (3-Column Layout)
```
+----------------------------------------------------------------------------------------------------+
|  ClinIQ Header (Doctor: Dr. Sarah | Patient: Jane Doe, Age: 42 | Visit ID: #V-1049 | Timer: 08:45)   |
+------------------------------------+--------------------------------+------------------------------+
| Column 1: Live Audio & Dialogue    | Column 2: Agentic Decision CDS | Column 3: SOAP Note Editor   |
|                                    |                                |                              |
| [ ||||||||||  Mic Live (44.1kHz) ] | [!] RED FLAG ALERT             | [ S - Subjective           ] |
|                                    | Retrosternal pressure on exert | 42yo female presenting with  |
| Speaker 0 (Doctor) [00:12]:        |                                | 3-day history of exertional  |
| "Tell me when the chest tightness  | [ Ranked Differential Diagnoses] chest tightness...            |
| started."                          | 1. Angina Pectoris (88%)       |                              |
|                                    |    - NICE CG95 matched         | [ O - Objective            ] |
| Speaker 1 (Patient) [00:18]:       | 2. GERD / Esophageal (62%)     | BP 138/86, HR 78 bpm         |
| "Three days ago when climbing      | 3. Musculoskeletal (35%)       | Lungs clear to auscultation  |
| stairs."                           |                                |                              |
|                                    | [ Suggested Probing Questions ]| [ A - Assessment           ] |
| [ Pause ] [ Stop & Analyze ]       | - Does pain radiate to jaw/arm?| Primary: Stable Angina       |
|                                    | - Any relief with antacids?    |                              |
|                                    |                                | [ P - Plan                 ] |
|                                    |                                | ECG 12-lead, sublingual GTN  |
|                                    |                                |                              |
|                                    |                                | [ Save Note ] [ Export PDF ] |
+------------------------------------+--------------------------------+------------------------------+
```

### 4.2 Patient Portal (Self-Service)
* **Appointment Booking Wizard:** Multi-step stepper component (Specialty $\to$ Doctor $\to$ Date & Slot $\to$ OTP Verification $\to$ Booking Confirmation).
* **My Health Records & Reports:** Card-based list displaying past consultations, signed SOAP summaries, and one-click PDF downloads.

### 4.3 Admin Operations Dashboard
* **Doctor Schedule Grid:** Real-time visual calendar to configure working hours, break buffers, and slot durations.
* **User & Role Directory:** Table with pagination, search, role toggles (`ADMIN`, `DOCTOR`, `PATIENT`), and activity audit logs.

### 4.4 Clinical Prescription Directives & Modal Component Specs
* **Prescription Card Container (`.soap-prescription-card`):**
  * Border: `1.5px solid #2dd4bf` (Teal 400), background `#ffffff` / `#1e293b` (dark).
  * Rounded corners: `12px`, padding: `1rem 1.35rem`.
  * Left icon box: `44px x 44px`, background `rgba(45, 212, 191, 0.14)`, SVG list/rx icon.
  * Hierarchy: Title (`font-weight: 700`), Medication & Strength bold (`0.92rem`), metadata dot dividers, supply/refill line (`0.8rem`).
  * Interactive review button: `.btn-rx-review` with pen icon (`#0d9488`).
* **Edit Prescription Modal Dialog (`.rx-edit-modal-card`):**
  * Width: `95%`, `max-width: 620px`, `border-radius: 16px`, `box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.28)`.
  * 2-Column Responsive Form Grids: Strength/Route, Frequency/Duration, Quantity/Refills (`1fr 1fr`).
  * Safety Info Banner: Cyan-tinted alert box (`#f0fdfa`, border `#ccfbf1`) with info circle.
  * Footer Actions: Live change tracking label ("No changes made" / "Unsaved changes"), secondary "Discard" button, and primary "Save prescription" button (`#0f3d39`).

### 4.5 Doctor Print Layout & Patient Portal Directives Design Specs
* **Print Stylesheet (`@media print`):**
  * Hides header, sidebar, patient session navigation, left workspace audio panel, tabs, and action buttons.
  * Preserves `#soap-printable-area` with full-fidelity card borders, Teal accent strip, and `.soap-prescription-card` with clean white/green contrast and `page-break-inside: avoid`.
* **Patient Portal Directives Chips (`.rx-directives-chips`):**
  * Displays pill badges (`.rx-chip`) with subtle green border (`#86efac`), background (`#f0fdf4`), and icon pairings for Strength, Route, Frequency, Duration, Dispense Quantity, and Refills.
* **Patient Portal SOAP Modal Prescription Directive Box (`.rx-prescribed-box`):**
  * Emerald header badge (`#15803d` / `#dcfce7`), clean pill items for dosage & duration, and clinical instructions callout with green left accent border.

### 4.6 Autonomous AI Suggestions Panel & Nudge Card Component Specs
* **AI Suggestions Panel Container (`.ai-suggestions-panel-card`):**
  * Padding: `1.25rem 1.4rem`, border radius: `12px`, background: `var(--card-bg)`, border: `1px solid var(--border-color)`.
  * Header: Title with wand magic sparkles icon box (`#0d9488`, `20px x 20px`), live tag (`live · updating` or `awaiting audio`).
* **Nudge Card Styling (`.nudge-card`):**
  * Border radius: `10px`, padding: `0.85rem 1rem`, gap: `0.35rem`.
  * Tag typography: `0.68rem`, bold (`800`), uppercase letter-spacing `0.05em`.
  * Body text typography: `0.825rem`, line height `1.45`.
* **Priority Color Pillars:**
  * **High (`.nudge-high`):** Light: `background: #fef2f2`, border: `#fecaca`, tag: `#dc2626`, text: `#7f1d1d`. Dark: `background: rgba(239, 68, 68, 0.12)`, border: `rgba(239, 68, 68, 0.35)`, tag: `#f87171`, text: `#fecaca`.
  * **Medium (`.nudge-medium`):** Light: `background: #fffbeb`, border: `#fef3c7`, tag: `#d97706`, text: `#78350f`. Dark: `background: rgba(245, 158, 11, 0.12)`, border: `rgba(245, 158, 11, 0.35)`, tag: `#fbbf24`, text: `#fde68a`.
  * **Low (`.nudge-low`):** Light: `background: #f0fdf4`, border: `#bbf7d0`, tag: `#16a34a`, text: `#14532d`. Dark: `background: rgba(16, 185, 129, 0.12)`, border: `rgba(16, 185, 129, 0.35)`, tag: `#34d399`, text: `#a7f3d0`.

### 4.6 Key Findings & Vitals Card Tokens
* **Card Container (`.finding-card`):** Rounded pill card with subtle border (`border: 1px solid var(--border-light)`), elevation on hover (`box-shadow: 0 2px 8px rgba(0,0,0,0.04)`).
* **Grid Architecture (`.key-findings-grid`):** 2-column grid (`grid-template-columns: repeat(2, 1fr); gap: 0.75rem;`). Contains exactly 3 cards:
  * **Card 1: CHIEF COMPLAINT** (Column 1, Row 1)
  * **Card 2: SYMPTOMS** (Column 2, Row 1)
  * **Card 3: VITALS** (Column 1 / -1 Full-Width Span, Row 2 via `&:last-child:nth-child(odd) { grid-column: 1 / -1; }`)
* **Eyebrow Label (`.finding-label`):** 11px uppercase bold caption (`font-weight: 700`, `letter-spacing: 0.05em`, color `#64748b`).
* **Value Text (`.finding-val`):** 13px clean text typography (`color: #0f172a`, dark mode `#f8fafc`, `line-height: 1.45`, `word-break: break-word`).
* **Formatting Format:** Vitals formatted as bullet-separated standard clinical tokens (`BP: 120/80 mmHg · HR: 72 bpm · SpO2: 98% · Temp: 36.6 °C`). Raw JSON braces (`{}`) strictly forbidden.

### 4.7 Dynamic 5-Tab CDS Screen Layout & Component Specs
* **Tab 1: Analysis & Summary:** Clinical narrative summary card, key findings vitals grid, and identified issues list with severity dots (`.issue-danger`, `.issue-warning`, `.issue-info`).
* **Tab 2: Clinical Decision:** Ranked differential diagnosis cards (`.diff-diag-card`) with numerical rank badges, ICD-10 code pills (`.icd-tag`), risk badges (`.risk-pill.high/medium/low`), colored progress bars, and critical red-flag alerts (`.critical-red-flag-card`).
* **Tab 3: Confidence:** Overall diagnostic confidence semi-arc gauge (`.gauge-semi-arc`) with threshold indicator, 5-domain breakdown bars (`.domain-metric-row`), and actionable protocol inquiry redirect button.
* **Tab 4: Follow-up:** Clinical protocol inquiry list (`.protocol-question-card`) with priority color pillars, live verbal inquiry banner (`.live-inquiry-banner`), and addressed finding snippets (`.answered-finding-snippet`).
* **Tab 5: Medicines:** RAG guideline prescribing list (`.med-card`) with drug name, therapeutic class tag, evidence grade, BNF/NICE source, dosage line, and amber warning box (`.med-warning-box`).
* **Tab 6: SOAP Report:** Structured clinical documentation with letter badge circles (`S`, `O`, `A`, `P`), inline textarea editing, AI reframing triggers, and physician prescription directives card.

### 4.8 Insecure Context Notice Banner & Setup Guide (`.insecure-context-banner`)
* **Alert Container:** Amber tinted backdrop (`rgba(245, 158, 11, 0.12)`), solid border (`1px solid rgba(245, 158, 11, 0.35)`), border-radius `8px`, text color `#fde68a`.
* **Actionable Guide Toggle:** Interactive button with setup instructions toggle (`.showInsecureContextHelp`).
* **Instruction Card:** Elevated dark container (`rgba(15, 23, 42, 0.95)`), cyan border (`1px solid rgba(56, 189, 248, 0.35)`), step-by-step Chrome flag guidance, and direct HTTPS link (`https://172.16.17.181/`).

### 4.9 Doctor Queue Roster & Appointment Schedule Cards
* **Header Greeting & Doctor ID Badge:** Displays doctor name, ID pill (`ID: DOC-008 · Cardiology`), hospital affiliation, and on-duty status pill.
* **KPI Metrics Strip:** 4 distinct counter cards (Total Today, In Progress, Waiting, Remaining) with clean numerical metrics and descriptive status subtitles.
* **Schedule Card List (`.schedule-card`):**
  * Time slot indicator (`09:00 AM`, `09:45 AM`, `10:30 AM`).
  * Patient initials badge circle, full patient name, demographics chip (`42M · #00847261`), and clinical visit reason.
  * Arrival status pill (`IN_CONSULTATION` in green/emerald, `SCHEDULED` in slate/blue, `ARRIVED` in amber/yellow).
  * One-click "Start Consultation" or "Resume Consultation" action button.
* **Zero-Flicker Skeleton & Empty State Prevention:** Cached signal data loads synchronously before HTTP responses, preventing the layout from collapsing into an empty state ("No Scheduled Patients Yet Today") on page refresh.

### 4.10 Consultation Completion & SOAP Persistence Flow
* **"Close & Complete Consultation" Action:** Modal action button in `doctor-dashboard.component.html` that triggers `closeAndCompleteConsultation()`.
* **Dual Persistence Pipeline:**
  1. Calls `saveFinalSOAPToDatabase()` to commit Subjective, Objective, Assessment, Plan notes and feedback to `soap_feedback`.
  2. Updates session status to `COMPLETED` and updates appointment record.
  3. Displays a confirmation toast and transitions cleanly back to the doctor queue view.

---

## 5. UI Micro-Interactions & Animations

* **Pulse Glow:** Subtle breathing animation around the microphone recording button when active (`@keyframes pulse-ring`).
* **Dedicated Follow-up Protocol Tab:** Houses the full clinical protocol inquiry system with priority indicator pillars (High/Moderate/Routine), live ambient verbal prompting banners, and protocol fulfillment tracking.
* **High-Contrast Active Notice Banner:** Professional, emoji-free prompt banner with an emerald-bordered gradient, pulsing live ambient indicator, structured clinical metadata tags, and accessible dismiss button for high visual clarity across all display modes.


