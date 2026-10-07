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

---

## 5. UI Micro-Interactions & Animations

* **Pulse Glow:** Subtle breathing animation around the microphone recording button when active (`@keyframes pulse-ring`).
* **Dedicated Follow-up Protocol Tab:** Houses the full clinical protocol inquiry system with priority indicator pillars (High/Moderate/Routine), live ambient verbal prompting banners, and protocol fulfillment tracking.
* **High-Contrast Active Notice Banner:** Professional, emoji-free prompt banner with an emerald-bordered gradient, pulsing live ambient indicator, structured clinical metadata tags, and accessible dismiss button for high visual clarity across all display modes.

