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



---

## 2. Environment Configurations

| Variable / Setting | Location | Description |
| :--- | :--- | :--- |
| `apiUrl` | `src/environments/environment.ts` | Backend FastAPI server endpoint (`http://127.0.0.1:8000`). |
| `production` | `src/environments/environment.prod.ts` | Set to `true` for production builds. |
| `defaultPort` | `angular.json` | Default development server port (`4200`). |

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
