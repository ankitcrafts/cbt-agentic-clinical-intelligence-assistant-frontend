# Product Requirements Document (PRD)
## ClinIQ: Agentic Clinical Intelligence Assistant (Full-Stack & Frontend System)

---

## 1. Executive Summary
**ClinIQ** is an ambient clinical intelligence and agentic workflow platform designed to reduce clinician cognitive burden and documentation fatigue during medical consultations. By operating unobtrusively in the background, ClinIQ captures doctor-patient dialogues, performs real-time speech-to-text with medical diarization, executes contextual clinical decision support via retrieval-augmented generation (RAG) on NICE guidelines, and automatically structures the dialogue into standard SOAP (Subjective, Objective, Assessment, Plan) notes and patient-friendly aftercare summaries.

This repository (`cbt-agentic-clinical-intelligence-assistant - Backup`) houses the complete web frontend application built with Angular 19, client-side state management, multi-role portal interfaces (Doctor, Patient, Administrator), and architectural scaffolds for AI evaluation and cross-service orchestration.

---

## 2. Problem Statement
* **Physician Burnout:** Doctors spend over 2 hours on administrative and documentation tasks (EHR/EMR entry) for every hour of direct patient care.
* **Cognitive Overload:** Synthesizing complex symptoms under tight time constraints increases the risk of diagnostic oversight or missing atypical clinical red flags.
* **Patient Discharge Confusion:** Patients often forget 40-80% of verbal medical information provided during a consultation immediately upon leaving the clinic.
* **Fragmented Clinic Operations:** Booking, OTP-based secure patient access, live ambient transcription, and clinical record archival often exist in siloed, non-interoperable tools.

---

## 3. Target User Personas

| Persona | Role & Needs | Key Value Delivered |
| :--- | :--- | :--- |
| **Dr. Sarah (Physician / Specialist)** | Conducts 20+ consultations daily. Needs ambient listening, instant differential diagnosis suggestions, automated SOAP drafting, and one-click PDF sign-off. | Eliminates manual charting; provides evidence-based NICE guideline prompts at point of care. |
| **John (Patient / Family Caregiver)** | Books appointments online, receives OTP login without passwords, views post-consultation aftercare summaries and prescriptions in plain English. | Seamless portal access, clear discharge instructions, and automated email follow-ups. |
| **Elena (Clinic Administrator)** | Manages doctor schedules, oversees appointment booking slots, monitors system telemetry, and maintains clinic user directories. | Centralized dashboard for appointment slots, doctor-patient assignments, and audit trails. |

---

## 4. User Journeys & Core Workflows

### 4.1 Doctor Consultation Journey
```mermaid
sequenceDiagram
    autonumber
    actor Doctor
    participant UI as Angular Portal
    participant API as Backend FastAPI
    participant STT as Deepgram Audio Engine
    participant RAG as LangGraph / Vector DB
    
    Doctor->>UI: Selects Patient & Starts Consultation
    Doctor->>UI: Activates Ambient Audio Recorder
    UI->>API: Streams / Uploads Audio Segment
    API->>STT: Diarize & Transcribe Audio
    STT-->>API: Speaker Segments (Doctor vs Patient)
    API->>RAG: Extract Clinical Entities & Query NICE Guidelines
    RAG-->>API: Differential Diagnoses & Live Clinical Suggestions
    API-->>UI: Real-time Transcript & Diagnostic Suggestions
    Doctor->>UI: Reviews & Edits AI-Generated SOAP Note
    Doctor->>UI: Approves & Finalizes Visit Report
    UI->>API: Triggers PDF Generation & GDrive Archival
    API-->>UI: Downloadable PDF & Synced GDrive Link
```

### 4.2 Patient Booking & OTP Verification Flow
1. Patient visits the ClinIQ Portal.
2. Selects specialty, doctor, date, and available time slot.
3. Enters email address to receive a secure 6-digit one-time password (OTP).

### 4.3 Multi-Turn Follow-Up & Dynamic Confidence Escalation Workflow
1. **Initial Assessment & Confidence Evaluation (< 70% threshold):** When consultation dialogue yields diagnostic confidence below 70% (e.g., 58%), the system flags incomplete symptom topography, unexplored lifestyle factors, or unexcluded red flags.
2. **Guideline-Based Follow-Up Questions:** Surfaced prominently in the Clinical Decision and Confidence tabs with priority tags (`HIGH`, `MEDIUM`, `LOW`).
3. **Continuous Session Recording:** The clinician continues the active audio recording within the **same session**, asking targeted follow-up inquiries.
4. **Dynamic Re-Analysis & Merging (≥ 70% Target Reached):** Upon capturing follow-up answers, diagnostic confidence escalates to 86%+, and all 5 CDS tabs (Analysis & Summary, Clinical Decision, Medicines, Confidence, and SOAP Report) dynamically update and merge new clinical data into a unified comprehensive record.
4. Verifies OTP to confirm identity and book the consultation.
5. Receives email confirmation and calendar invite.
6. Accesses historical visits, lab instructions, and aftercare summaries post-visit.

---

## 5. Functional Requirements

### 5.1 Real-Time Ambient Capture & Transcription
* **FR-1.1:** Browser-native audio capture using MediaRecorder API with visual audio waveform / volume meters.
* **FR-1.2:** Diarized conversation transcript display distinguishing between `Doctor` and `Patient` utterances.
* **FR-1.3:** Capability to pause, resume, and upload pre-recorded consultation audio files (`.wav`, `.mp3`, `.m4a`).

### 5.2 Clinical Decision Support (CDS) & Live Insights
* **FR-2.1:** Real-time extraction of symptoms, onset, medical history, medications, and allergies.
* **FR-2.2:** Differential diagnosis card ranking with confidence indicators and justification quotes from clinical guidelines.
* **FR-2.3:** Red Flag alerts highlighting emergency warning signs requiring immediate triage.
* **FR-2.5:** 6-tab scrollable Clinical Decision Support (CDS) console (Analysis & Summary, Clinical Decision, Confidence, Follow-up, Medicines, SOAP Report) with sticky top navigation and isolated viewport scrolling.

### 5.3 Automated Documentation & Export
* **FR-3.1:** Instant drafting of structured SOAP notes divided into:
  * **S (Subjective):** Chief complaint, History of Present Illness (HPI), Review of Systems.
  * **O (Objective):** Vital signs, physical examination notes, observational data.
  * **A (Assessment):** Primary diagnosis and ranked differential diagnoses.
  * **P (Plan):** Diagnostic workup, medication prescriptions, lifestyle advice, follow-up timeline.
* **FR-3.2:** Rich text editing and live reframing of individual SOAP sections before signing off.
* **FR-3.3:** One-click generation of two PDF artifacts:
  * **Clinical Analysis Report** (Detailed physician-facing record).
  * **SOAP Note & Aftercare Report** (Patient-facing summary).
* **FR-3.4:** Automated cloud backup to Google Drive with shareable preview links.
* **FR-3.5:** Physician Wisdom Prescription Directives & Interactive Modal: Dedicated Prescription card positioned at the bottom of the SOAP Report tab (below Plan), enabling clinicians to prescribe medications based on their own judgment. Clicking the card opens an "Edit prescription" modal supporting medication, strength, route, frequency, duration, quantity, refills, instructions, and review alerts. Directives are automatically integrated into exported PDF reports and synchronized with the patient portal.
* **FR-3.6:** Doctor Consultation Export (Download PDF), Dedicated Print, & Patient Portal Prescription & SOAP Note Sharing Synchronization: Enables attending physicians to export official signed clinical consultation reports as formatted PDFs with integrated medication directives; provides dedicated print views via browser printing hiding non-clinical UI chrome; and enables instantaneous sharing with the patient portal so patients can view their official SOAP notes and prescribed medication directives with structured chips upon sign-in or real-time broadcast.
* **FR-3.7:** Clinical Vitals Formatting & Braces Prevention: Clinical vitals in KEY FINDINGS and Objective SOAP sections must display as standardized, formatted clinical metrics (`BP: 120/80 mmHg · HR: 72 bpm · SpO2: 98% · Blood Sugar: ...`) and never render raw stringified JSON objects (`{}`) or raw braces. If dialogue lacks vitals, intake triage vitals or baseline metrics are formatted cleanly.
* **FR-3.8:** Dynamic 5-Tab CDS Rendering Across Teleconsultation Channels: For remote audio channels (MS Teams, Google Meet, WhatsApp) and pre-recorded files, after transcription completes, all Clinical Decision Support tabs (Clinical Decision, Confidence, Follow-up, Medicines, SOAP Report) must dynamically render dialogue-derived clinical data. Client and service pipelines synthesize accurate differential hypotheses (Diabetes, Hypertension, Tension Headache, Respiratory), RAG medications, 5-domain confidence breakdowns, and dialogue-grounded SOAP reports matching the active patient presentation.

### 5.4 Scheduling, Multi-Role Portals & Authentication
* **FR-4.1:** Passwordless authentication utilizing Gmail SMTP 6-digit OTP delivery.
* **FR-4.2:** Role-based access control (RBAC) with three distinct views: `DOCTOR`, `PATIENT`, and `ADMIN`.
* **FR-4.3:** Interactive appointment scheduling grid with doctor availability slots, buffer management, and status lifecycle (`SCHEDULED`, `COMPLETED`, `CANCELLED`).
* **FR-4.4:** Fresh State Initialization on Session Scheduling: Whenever a new session or next session appointment is scheduled/rescheduled with any doctor, or when clicking "New Session", the dialogue transcript, AI suggestions, and all 5 CDS tabs automatically reset to a clean, patient-specific intake state without retaining stale audio or drafts from previous sessions.
* **FR-4.5:** Polymorphic AI Suggestions Resolution & Encounter History Fidelity: Real-time autonomous AI suggestions (prompts, red-flag warnings, and clinical inquiries) must reliably display across both active live consultations and past session history reviews, automatically resolving text and priority metadata regardless of storage schema variations (`{title, description}` vs `{id, type, tag, text}`).
* **FR-4.6:** Doctor Appointment Queue Persistence & Reload Resilience: When any doctor signs into the Doctor Portal (including newly provisioned clinical specialists such as Dr. Ankit Kumar `DOC-008`), their assigned patient queue and KPI metrics (Total Today, In Progress, Waiting, Remaining) must populate immediately. Re-loading or refreshing the browser page must never clear or blank the dashboard, achieved via immediate local cache hydration (`cliniq_patients_cache`) and session persistence (`cliniq_doctor_view_mode`, `cliniq_doctor_active_visit`). Fallback logic guarantees that if direct ID matches are not yet linked, department triage patients are surfaced rather than showing an empty screen.

---

## 6. Non-Functional Requirements

### 6.1 Performance & Latency
* Initial application load under 2 seconds on standard broadband.
* Real-time audio chunk processing and transcript display latency under 1.5 seconds.
* Live diagnostic suggestion updates within 3 seconds of conversation chunk submission.

### 6.2 Security & Compliance
* All patient health information (PHI) transmitted over TLS 1.3 / HTTPS.
* No hardcoded API keys or authentication credentials in client-side bundles.
* Role-based route guards in Angular preventing unauthorized portal access.
* Ephemeral local browser storage with automatic session timeout.

### 6.3 Usability & Accessibility
* Responsive design adhering to WCAG 2.1 AA accessibility guidelines.
* High-contrast clinical theme with calm, modern aesthetics (Indigo / Teal palette).
* Keyboard-friendly shortcuts for common physician actions (e.g., toggle recording, save note).

---

## 7. Success Metrics & KPIs
* **Documentation Time Reduction:** $\ge 70\%$ reduction in average time spent per patient encounter for clinical charting.
* **Diagnostic Agreement:** $\ge 90\%$ concordance between AI differential suggestions and attending physician's final assessment.
* **Transcription Word Error Rate (WER):** $< 8\%$ on medical terminology and physician dictation.
* **User Adoption & Satisfaction:** Physician Net Promoter Score (NPS) $> 60$.

---

## 8. Production Deployment & Cloudflare Zero Trust Ingress
* **FR-8.1 Zero Trust Protected Host:** Production deployment hosted on Ubuntu 24.04 server `ubtsrv01` at internal IP `172.16.17.181`, accessible securely across the Cloudflare Zero Trust gateway (`cbtlab.cloudflareaccess.com`) with WARP virtual client interface (`10.64.20.180`).
* **FR-8.2 Full-Stack Container Orchestration:** Orchestrated with Docker Compose v2 across 4 isolated microservices (`cliniq-frontend-prod`, `cliniq-backend-prod`, `cliniq-postgres-prod`, `cliniq-redis-prod`).
* **FR-8.3 Single-Origin Unified Ingress:** Single ingress port 80 handled by Nginx reverse proxy serving the Angular 19 SPA and routing API, RAG, and health endpoints to the backend with zero CORS issues.
* **FR-8.4 Automated Telemetry Verification:** Real-time `/health` telemetry endpoint monitoring database health, tracing, and storage persistence. All 6 automated deployment tests verified passing (100%).
* **FR-8.5 Multi-Modal Secure Audio Acquisition & Port 443 TLS:** Dual ingress on port 80 (HTTP) and port 443 (HTTPS TLS 1.2/1.3) with self-signed SSL certificates ensuring W3C Secure Context compliance for browser hardware capture (`navigator.mediaDevices`). Seamless channel fallback to direct file uploads (`FILE_UPLOAD`) with drag-and-drop support, isolated from browser media streams, and in-app browser configuration setup guides.

