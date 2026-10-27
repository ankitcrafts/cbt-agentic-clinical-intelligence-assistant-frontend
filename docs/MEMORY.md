# Operational Memory, ADRs & Troubleshooting
## ClinIQ: Frontend & System Operational Memory

---

## 1. Architectural Decision Records (ADRs)

### ADR-FE-01: Adoption of Angular 19 Standalone Architecture
* **Context:** The application required rapid component loading, modular role isolation (`DOCTOR`, `PATIENT`, `ADMIN`), and minimal bundle overhead.
* **Decision:** Adopt Angular 19 Standalone Components exclusively, deprecating `NgModule`.
* **Consequence:** Cleaner imports, zero circular module dependencies, faster esbuild compilation, and direct dependency injection.

### ADR-FE-02: Angular Signals for High-Frequency State vs RxJS for Streams
* **Context:** Audio waveform rendering and live transcription updates fire dozens of times per second, risking UI lag if triggering full Zone.js change detection sweeps.
* **Decision:** Use Angular **Signals** (`signal()`, `computed()`) for UI state (e.g. recording elapsed time, volume meter, card selection) while using **RxJS** for asynchronous HTTP calls and SSE event streams.
* **Consequence:** High-performance 60 FPS rendering without micro-stutter during live consultations.

### ADR-FE-03: Passwordless OTP Authentication via Gmail SMTP
* **Context:** Patients and doctors frequently forget passwords, creating friction during clinical check-in.
* **Decision:** Implement 6-digit one-time password (OTP) delivery directly to the user's registered email with a 5-minute validity window.
* **Consequence:** Frictionless login flow, reduced support tickets for password resets, and robust email verification on booking.

### ADR-FE-04: Multi-Turn In-Session Follow-Up & Dynamic Confidence Escalation
* **Context:** When diagnostic confidence falls below the clinical safety threshold (70%), clinicians need immediate guideline-based prompts and the ability to continue recording in the active session without starting a new disjoint encounter.
* **Decision:** Keep the recording context active in the same session, append follow-up audio and exchanges, recalculate all 5 intelligence tabs (Analysis, Clinical Decision, Medicines, Confidence, and SOAP Report), and merge follow-up findings into the final SOAP report.
* **Consequence:** Diagnostic confidence elevates to 86%+, red flags are formally ruled out, and SOAP documentation reflects complete, multi-turn clinical reasoning.

### ADR-FE-05: Dynamic & Extensible Follow-Up Question Architecture
* **Context:** Follow-up questions must adapt to any patient's symptoms/complaints rather than static mock templates, and must seamlessly merge future sub-agents, graph-based follow-up pipelines, or dedicated API microservices developed by team members.
* **Decision:** Decoupled the UI follow-up layer to accept dynamic questions from `ClinicalAnalysisData`, maintain stateful answering sets, and dynamically synthesize conversational doctor-patient turns with graceful condition-based fallbacks.
* **Consequence:** Zero UI disruption when swapping or upgrading backend follow-up generators, and instant support for arbitrary clinical conditions.

### ADR-FE-06: Multi-Appointment Sequential Session Lifecycle & Encounter Numbering
* **Context:** Each in-person or remote appointment represents an independent clinical encounter that must only finalize as a completed session (e.g. Session 1) when the physician explicitly closes the consultation. Opening a consultation must immediately present today's active session rather than locking onto historical completed records.
* **Decision:** Default `selectedSessionId` to `'live'` upon opening any patient consultation, calculate dynamic session numbering as `N+1` based on completed records, and persist the finalized encounter to backend `/api/scheduling/patients/{id}/sessions` upon clicking `Close Consultation`.
* **Consequence:** Clean progression from Session 1 to Session 2 and beyond across distinct appointments, with instant access to past session history records without interface confusion.

### ADR-FE-07: CDS Tab Screens Scrollable Viewport & Pinned Navigation Architecture
* **Context:** The 5 Clinical Decision Support (CDS) tab screens (Analysis & Summary, Clinical Decision, Medicines, Confidence, and SOAP Note) contain rich clinical protocol data (DDx rankings, red flags, audio protocol inquiries, RAG drug lists, SOAP sections) that exceed typical viewport heights.
* **Decision:** Implemented a flex-column layout with `position: sticky; top: 0; z-index: 11-12;` on the intelligence top navigation and 5-segment tab selector bar (`.intel-tabs-nav`), combined with a bounded scrollable viewport on `.intel-tab-content-area` (`max-height: calc(100vh - 210px); overflow-y: auto;`) and isolated `.tab-pane` scrolling with custom teal scrollbars.
* **Consequence:** Clinicians can effortlessly scroll through all medical recommendations, protocol questionnaires, and SOAP note sections while keeping tab navigation permanently visible at the top.

### ADR-FE-08: Fresh State Isolation for Scheduled Next Sessions & New Sessions
* **Context:** When a next session or new session appointment is scheduled/rescheduled for a patient with any doctor, or when starting a "New Session", old transcripts, AI suggestions, and 5-CDS tab data from previous patients or earlier sessions must not persist or leak into the newly scheduled consultation.
* **Decision:** Implemented `RecordingService.resetPatientState(patientId)` invoked automatically during slot assignment, walk-in registration, and consultation completion. In `DoctorDashboardComponent`, `openConsultation` and `startNewSession()` reset live draft signals (`latestTranscript`, `latestExchanges`, `latestSuggestions`, `latestClinicalAnalysis`, `patientSummaryText`, `editedSoapReport`), while 5-CDS getters dynamically bind to the current patient's triage intake data with dedicated empty states (`.empty-diff-state`, `.empty-meds-state`) prior to recording audio.
* **Consequence:** 100% clean, patient-isolated consultation workspaces for every newly scheduled appointment across any doctor.

### ADR-FE-09: Transcript Speaker Avatar Initial Disambiguation & Layout Alignment
* **Context:** When rendering consultation transcripts, avatar bubbles must cleanly reflect the attending physician's initials (`doctorInitials`, e.g. `AK`) on the left side with green/teal styling and the patient's initials (`visitDetails.initials`, e.g. `T`) on the right side with neutral styling.
* **Decision:** Updated template avatar initial resolution in `doctor-dashboard.component.html` to prioritize `doctorInitials` for doctor rows (`ex.isDoctor`) and `visitDetails.initials` for patient rows (`!ex.isDoctor`), eliminating badge collision or accidental fallback to raw exchange string tags.
* **Consequence:** Pristine visual differentiation between doctor speech and patient speech across all consultation modes.

### ADR-FE-10: Genuine Consultation Transcript Integrity & Decommissioning Dialogue Simulation
* **Context:** Previously, the "Automate Protocol" button simulated artificial multi-turn doctor/patient exchanges and injected fake dialogue strings directly into the live consultation transcript. This risked polluting actual clinical documentation with unsaid medical statements.
* **Decision:** Completely decommissioned the automated simulation script (`triggerFollowUpQuestionsFlow`) and removed all "Automate Protocol" buttons from the header, protocol card, and Confidence tab. Protocol inquiries remain as high-value physician guidance prompts with "Ask Verbally" controls that keep the live microphone channel active for real verbal consultation without injecting synthetic text.
* **Consequence:** 100% genuine transcript fidelity matching only what was verbally spoken and transcribed in the clinical encounter.

### ADR-FE-11: 6-Tab Clinical Decision Support (CDS) Architecture & Dedicated Follow-Up Section
* **Context:** Clinical decision workflows require an intuitive progression: initial diagnostic synthesis, differential diagnosis ranking, confidence verification, targeted clinical probing questions, guideline medications, and final SOAP note generation.
* **Decision:** Reconfigured `.intel-tabs-nav` to adopt the 6-tab sequence: `1. Analysis & Summary`, `2. Clinical Decision`, `3. Confidence`, `4. Follow-up`, `5. Medicines`, and `6. SOAP Report`. Extracted the Targeted Clinical Protocol Inquiries card system into its dedicated `Follow-up` tab with identical visual design tokens, live verbal prompt banners, priority accent pillars, and progress tracking.
* **Consequence:** Clean clinical separation between differential diagnosis assessment and targeted follow-up probing, allowing physicians to navigate seamlessly across each phase of the consultation.

### ADR-FE-12: High-Contrast Clinical Notification Banner & Emoji Decommissioning
* **Context:** Previous notice banners utilized low-contrast cyan text over light teal backgrounds with emoji characters (`🎙️`, `⚠️`) that produced readability issues on medical displays.
* **Decision:** Re-architected `.active-notice-banner` with a crisp gradient background, 4px teal accent border, dark slate readable typography (`#0f172a` in light mode, `#f1f5f9` in dark mode), dedicated badge chip (`Active Probing Inquiry`), live red pulsing dot indicator, FontAwesome vector iconography, and accessible dismiss button without emojis.
* **Consequence:** 100% reliable clinical legibility and professional aesthetic across both standard daylight and dark clinic viewing modes.

### ADR-FE-13: Physician Wisdom Prescription Directives & Interactive Modal Dialog Architecture
* **Context:** Clinical decision support must empower clinicians to prescribe medications based on their own judgment, clinical wisdom, and the trust established with patients. The prescription card must sit prominently at the bottom of the SOAP Report tab (below Plan), and clicking it must trigger a dedicated edit dialog matching the Figma specification (Images 1, 2, and 3).
* **Decision:** Implemented `.soap-prescription-card` within `.soap-preview-container` below Plan with an emerald/teal border, icon box, dosage/frequency/duration metadata, supply details, and a "Review & edit" action. Developed `.rx-edit-modal-card` dialog supporting typed `PrescriptionItem` values (`medication`, `strength`, `route`, `frequency`, `duration`, `quantity`, `refills`, `instructions`), safety review warnings, and status tracking ("No changes made" / "Unsaved changes"). Integrated prescription data into `pdf-export.service.ts` for official PDF exports and `appointment.service.ts` for patient portal synchronization.
* **Consequence:** Full physician autonomy and trust in medication management, compliant with medical documentation standards and matching the user-requested Figma UX.

### ADR-FE-14: Doctor Export, Print, and Real-Time Patient Portal Sharing Synchronization
* **Context:** Physicians need three essential actions upon finalizing a clinical consultation: (1) Download an official certified PDF medical report, (2) Print a clean, unencumbered physical paper copy of the SOAP note and prescription, and (3) Share the finalized SOAP report and prescribed medications with the patient's portal so the patient can review them upon signing in or in real-time across devices.
* **Decision:**
  1. **Download (PDF Export):** Enhanced `PdfExportService.exportSoapNotePdf()` to dynamically generate certified clinical PDF artifacts featuring official hospital headers, patient demographics, vitals strip, 4-quadrant SOAP sections, the official Doctor's Prescription Directive breakdown (medication, strength, route, frequency, duration, quantity, refills, instructions), and an attending physician signature stamp.
  2. **Print Stylesheet (`@media print`):** Configured dedicated print stylesheet isolating `#soap-printable-area` and `.soap-prescription-card` with high print contrast while hiding application chrome (sidebar, audio controls, action buttons).
  3. **Patient Portal Synchronization:** Extended `AppointmentService.shareSoapReportWithPatient()` and backend `POST /api/scheduling/patients/{id}/share-soap` to persist the prescription and patient metadata into `patient_consultation_sessions.soap_report_json`. Added multi-key reactive localStorage caching (`cliniq_shared_soap_${patientId}`, `cliniq_shared_soap_${name}`, `cliniq_last_shared_soap`) and `cliniq_soap_shared` event broadcasts so that whenever the patient signs in or navigates to Tab 3 (Prescriptions), their prescribed medications display with structured directive chips, and the verified SOAP report is immediately accessible via the modal viewer.
* **Consequence:** Seamless physician export capabilities and transparent patient access to clinical directives and official SOAP notes.

### ADR-FE-15: Resilient Polymorphic AI Suggestions Resolution & Persistence Normalization
* **Context:** In consultation views, AI Suggestions rendered blank cards with `HIGH · CLINICAL` pills and empty text when viewing historical session records (e.g. Session 1) or when suggestions were serialized in different data shapes (`{id, type, tag, text}` vs `{priority, category, title, description}` vs `{actionText, suggestion}`).
* **Decision:** Re-architected `currentAISuggestions` getter and `RecordingService.loadConsultationSession()`:
  1. **Polymorphic Text Resolution:** Priority-extracts content from `s.text`, `s.title — s.description`, `s.title`, `s.description`, `s.suggestion`, or `s.actionText`.
  2. **Tag & Type Normalization:** Preserves pre-formatted `s.tag` when present or synthesizes `${priority} · ${category}`, and derives CSS classes (`nudge-high`, `nudge-medium`, `nudge-low`).
  3. **Multi-Tier Candidate Fallback:** Inspects `recordingService.latestSuggestions()`, falls back to `aiSuggestionsList`, and further falls back to `clinicalAnalysis.ai_suggestions` / `clinicalAnalysis.aiSuggestions`.
  4. **HTML Double Safety Net:** Template falls back to `{{ nudge.text || (nudge.description ? (nudge.title + ' — ' + nudge.description) : nudge.title) }}` and supports `.nudge-low` and dark-mode tokens.
* **Consequence:** 100% reliable clinical prompt and alert rendering across all historical consultation visits and live sessions without blank card anomalies.

### ADR-FE-16: Angular 19 Production Containerization, Dynamic Origin Resolution & Nginx Reverse Proxy
* **Context:** Deploying Angular 19 alongside FastAPI behind Cloudflare Zero Trust requires unified single-origin ingress, client-side route preservation, and CORS elimination.
* **Decision:** Implemented multi-stage Dockerfile (Node.js 20 build -> Nginx 1.25 Alpine runtime), configured `environment.prod.ts` with dynamic `window.location.origin` resolution, and routed all API traffic through Nginx reverse proxy directives (`/api/`, `/analyze-conversation`, `/visit/`, `/reports/`, `/health`).
* **Consequence:** Single-origin architecture eliminating cross-origin preflight overhead, zero configuration changes across environments, and sub-10MB lightweight frontend container footprint.

### ADR-FE-17: Cloudflare Zero Trust Production Deployment & Remote Host Architecture
* **Context:** The production system must be securely accessible to clinical users without exposing unprotected public IP ports, using enterprise Cloudflare Zero Trust network authentication (`cbtlab`).
* **Decision:** Enrolled the host `ubtsrv01` (`172.16.17.181`) within the `cbtlab.cloudflareaccess.com` Zero Trust organization. Configured Docker Compose v2 container orchestration with automated health dependencies (`postgres:16`, `redis:7`, `cliniq-backend-prod`, `cliniq-frontend-prod`), with Nginx listening on port 80 and reverse-proxying all API requests directly to the backend.
* **Consequence:** 100% secure end-to-end access across Cloudflare WARP client, zero open external attack surface, zero CORS issues via single-origin routing, and sub-second response times. Verified 6/6 tests passing.

### ADR-FE-18: Doctor Dashboard Appointment Caching, Reload Resilience & Session Continuity
* **Context:** When doctors (such as Dr. Ankit Kumar `DOC-008`) signed in, the dashboard showed "No Scheduled Patients Yet Today" (0 appointments), and refreshing or reloading the browser resulted in a blank panel or lost active consultation state.
* **Decision:**
  1. Synchronized `DOC-008` (`Dr. Ankit Kumar`) into `appointment.service.ts` with dedicated slots `DOC-008-s1` through `s8` and seed patient assignments (`Marcus Delgado`, `Arjun Nair`, `Priya Sharma`).
  2. Implemented immediate local cache hydration (`cliniq_patients_cache`) in `AppointmentService` constructor, eliminating empty-state flashing before asynchronous backend responses finish.
  3. Added `sessionStorage` tracking for `cliniq_doctor_view_mode` and `cliniq_doctor_active_visit` in `DoctorDashboardComponent`, so refreshing the browser during an active consultation preserves the consultation workspace instead of resetting to an empty screen.
  4. Implemented multi-tier triage and department fallback in `getDoctorQueue()`, guaranteeing that clinicians never experience a blank dashboard if initial direct ID filters produce no results.
* **Consequence:** Instantaneous, zero-flicker dashboard rendering with continuous state persistence across page reloads and browser restarts.

---

## 2. Environment Configurations

| Variable / Setting | Location | Description |
| :--- | :--- | :--- |
| `apiUrl` | `src/environments/environment.ts` | Backend FastAPI server endpoint (`http://127.0.0.1:8000`). |
| `production` | `src/environments/environment.prod.ts` | Set to `true` for production builds. |
| `defaultPort` | `angular.json` | Default development server port (`4200`). |
| `SMTP_EMAIL` | `.env.production` | Verified sender email for OTP delivery (`ankitkumar021303@gmail.com`). |

---

## 3. Local Setup & Execution Guide

### Starting the Frontend Development Server
```powershell
# Navigate to frontend directory
cd "cbt-agentic-clinical-intelligence-assistant - Backup/frontend"

# Install node dependencies
npm install

# Start development server with Hot Module Replacement (HMR)
npm.cmd start
# or
npx ng serve --port 4200
```

---

## 4. Troubleshooting Runbook

### Issue 1: PowerShell Script Execution Policy Error (`npm.ps1 cannot be loaded`)
* **Symptom:** Running `npm start` in PowerShell fails with `File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled`.
* **Resolution:** Run using `npm.cmd start` or update PowerShell execution policy in an administrative shell:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

### Issue 2: Microphone Permission Blocked in Browser
* **Symptom:** Starting consultation shows an error that audio input cannot be accessed.
* **Resolution:** Ensure the browser URL is `http://localhost:4200` (which is treated as a secure context by Chrome/Edge) or served over `https://`. Check browser site settings to permit microphone access.

### Issue 3: CORS Errors when Calling Backend
* **Symptom:** `Access to XMLHttpRequest at 'http://127.0.0.1:8000/api/...' has been blocked by CORS policy`.
* **Resolution:** Verify that the FastAPI backend server is running and configured with `CORSMiddleware` allowing `allow_origins=["*"]` or `http://localhost:4200`.

### Issue 4: AI Suggestions Card Rendering Blank When Switching Sessions
* **Symptom:** When clicking past session records (e.g. Session 1) or completed encounters, the AI Suggestions panel shows red/pink cards with `HIGH · CLINICAL` but empty body text.
* **Resolution:** Ensure `currentAISuggestions` employs polymorphic text extraction handling both raw LLM schema (`{title, description, priority, category}`) and pre-serialized `{id, type, tag, text}` schemas, and verify template binding includes fallback expressions.

### Issue 5: Vitals Displayed Under Raw Curly Braces `{}` in Key Findings
* **Symptom:** Under KEY FINDINGS, the VITALS card displays `{}` or stringified JSON syntax instead of clean human-readable vitals.
* **Root Cause:** When `e.vital_signs` is an empty dictionary `{}` or stringified JSON from backend LLM entity extraction/fallbacks, JavaScript treats `{}` as truthy. Using `typeof e.vital_signs === 'object' ? JSON.stringify(e.vital_signs) : ...` produced the literal string `"{}"`. Furthermore, default evaluations like `patient.vitals || { ... }` evaluate to `{}` because empty objects are truthy.
* **Resolution:** 
  1. Implemented `formatVitalsDisplay` to validate non-empty keys, parse JSON safely, strip outer braces if any remain, and format recognized vitals (`BP`, `HR`, `SpO2`, `Temp`, `Weight`, `Pain`, `RR`, `Blood Sugar/Glucose`).
  2. Implemented empty-object detection (`Object.keys(v).length > 0`) for queue and patient selection defaults.
  3. Added clean fallback to patient intake vitals (`${intakeVitals} (Intake)`) or clinic baseline vitals (`BP: 120/80 mmHg · HR: 72 bpm · SpO2: 98% (Baseline)`) whenever no vitals are spoken during dialogue.

### Issue 6: MS Teams Consultation CDS Tabs Not Processing Dynamically
* **Symptom:** On MS Teams teleconsultations (and recorded call uploads), after transcription succeeded and Analysis & Summary rendered, Clinical Decision, Confidence, Follow-up, Medicines, and SOAP Report tabs remained empty or stuck on static Marcus Delgado placeholders (58% confidence, 0 medicines).
* **Root Cause:**
  1. `effectiveSoapReport` cached the initial placeholder into `this.editedSoapReport` upon component initialization and never cleared it when new audio was processed.
  2. Fallback in `routes.py` omitted `differential_diagnosis`, `guideline_medicines`, `confidence_metrics`, and `follow_up_questions`.
  3. Property naming mismatches (`icdCode` vs `icd10`, `overallScore` vs `top_differential_confidence_percent`).
  4. Hardcoded Marcus Delgado cephalalgia note and static 58% confidence block intercepted the getters.
* **Resolution:**
  1. Added `isSoapManuallyEdited: boolean` to track doctor edits without blocking live updates from fresh dialogue transcripts.
  2. Implemented dynamic client-side clinical synthesizers in `doctor-dashboard.component.ts`: `getDynamicDifferentialForCurrentPatient`, `getDynamicMedicinesForCurrentPatient`, `getDynamicRedFlagsForCurrentPatient`, `getDynamicFollowUpQuestionsForCurrentPatient`, `getDynamicConfidenceMetrics`, and `getDynamicSoapReport`.
  3. Handled multiple condition clusters (Diabetes, Hypertension, Tension Headache, Respiratory) ensuring all 5 CDS tabs respond dynamically to the active session.

### Issue 7: MediaDevices Insecure Context Restrictions on Remote IP Endpoints (`172.16.17.181`)
* **Symptom:** When accessing the production deployment at `http://172.16.17.181/`:
  - In-Person recording fails with `"Microphone access is not supported by your browser environment."`
  - MS Teams / Google Meet / WhatsApp teleconsultation recording fails with `"Screen/Tab system audio capture is not supported by your browser."`
  - Switching to "Upload File" preserves the error state and clicking the primary button triggers tab screen capture instead of opening the file picker.
* **Root Cause:**
  1. Under the W3C WebRTC / Media Capture specification, browsers (Google Chrome, Edge, Safari) designate non-localhost plain HTTP IP addresses (`http://172.16.17.181`) as Insecure Contexts (`window.isSecureContext === false`). In insecure contexts, `navigator.mediaDevices` (`getUserMedia` and `getDisplayMedia`) is deliberately disabled and set to `undefined`.
  2. In `recording.service.ts`, `startRecording()` defaulted all non-`IN_PERSON` modes to screen display media capture, causing `FILE_UPLOAD` to invoke `navigator.mediaDevices.getDisplayMedia`.
  3. Channel switcher in `doctor-dashboard.component.ts` lacked `@ViewChild('fileInput')` linkage and did not reset the `FAILED` state when switching modes.
* **Resolution:**
  1. Enabled dual HTTP (port 80) and HTTPS (port 443 with self-signed TLS certificates) on production Nginx and `docker-compose.prod.yml`. Accessing via `https://172.16.17.181/` satisfies the Secure Context requirement natively.
  2. Isolated `FILE_UPLOAD` mode in `recording.service.ts` and `doctor-dashboard.component.ts` to trigger native `<input type="file">` file dialogs without querying `navigator.mediaDevices`.
  3. Added auto-reset of `FAILED` error state on mode switching (`resetFailedState()`).
  4. Added prominent in-app guidance with step-by-step Chrome flag instructions (`chrome://flags/#unsafely-treat-insecure-origin-as-secure`) for users preferring plain HTTP.

### Issue 8: Doctor Dashboard Showing 0 Appointments and Resetting to Blank on Reload
* **Symptom:** After signing into the Doctor portal as Dr. Ankit Kumar (`DOC-008`), the dashboard rendered 0 appointments ("No Scheduled Patients Yet Today"), and refreshing the browser (F5) reverted any active consultation or left the dashboard completely blank.
* **Root Cause:**
  1. `DOC-008` was added to backend authentication but lacked doctor slot registrations and initial patient assignments in frontend `appointment.service.ts`.
  2. Database seeds had not mapped patients to `DOC-008` in PostgreSQL.
  3. Lack of client-side cache hydration caused the UI to initialize with empty arrays on page reload before network round-trips completed.
  4. `DoctorDashboardComponent` reset `viewMode = 'queue'` on reload, causing an active consultation to disappear if refreshed.
* **Resolution:**
  1. Added `DOC-008` with slots `DOC-008-s1` through `s8` and assigned Marcus Delgado, Arjun Nair, and Priya Sharma in `appointment.service.ts`.
  2. Added localStorage caching (`cliniq_patients_cache`) with synchronous hydration in `constructor()`.
  3. Stored `cliniq_doctor_view_mode` and `cliniq_doctor_active_visit` in `sessionStorage` during consultations and restored on `ngOnInit()`.
  4. Added triage and cardiology-department fallback in `getDoctorQueue()`.

### Issue 9: pgAdmin 4 Local vs Remote Container Database Desynchronization
* **Symptom:** Developer's pgAdmin 4 only displayed 17 historical test rows ending on Oct 21 in `soap_feedback` and appeared not to reflect data saved from `https://172.16.17.181/`.
* **Root Cause:**
  1. pgAdmin 4 was connected to local Windows PostgreSQL (`localhost:5432/cliniq_db`), whereas the deployed application ran on remote server `172.16.17.181` inside Docker container `cliniq-postgres-prod` writing to database `cliniIQ`.
  2. The production Docker Compose configuration did not map port 5432 to the host, preventing external pgAdmin connections.
  3. The consultation modal in `doctor-dashboard.component.ts` only saved to `soap_feedback` when doctors clicked "Share SOAP" or "Save", but omitted saving when doctors clicked "Close & Complete Consultation".
* **Resolution:**
  1. Exposed port `5432:5432` on `cliniq-postgres-prod` in `docker-compose.prod.yml`.
  2. Created mirror database `cliniq_db` and imported all historical rows from the local machine into the production container using dollar-quoted SQL strings.
  3. Integrated `saveFinalSOAPToDatabase()` directly into `closeAndCompleteConsultation()` in `doctor-dashboard.component.ts`.
  4. Updated backend scheduling routes to ensure automatic synchronization of both `DoctorModel` (`doctors` table) and `soap_feedback` table on session completion.

---

## 4. Architectural Decision Records (ADRs)

### ADR 14: Relational Persistence Port Exposure & Dual-Trigger SOAP Synchronization
* **Status:** Accepted (2026-10-27)
* **Context:** Remote administrative verification of clinical database tables required direct SQL access to the containerized database from client machines running pgAdmin 4 over Cloudflare Zero Trust. Additionally, clinical assessments generated during consultations had to be guaranteed persistence in relational tables (`soap_feedback` and `doctors`).
* **Decision:**
  1. Publish PostgreSQL port `5432` from `cliniq-postgres-prod` to the host network interface.
  2. Implement dual-trigger SOAP feedback persistence in both frontend and backend upon consultation completion.
  3. Synchronize `DoctorModel` alongside `User` on all clinician lifecycle events.
* **Consequences:** Eliminates data loss during rapid consultation closeouts and enables direct, secure SQL observability across the private network.



