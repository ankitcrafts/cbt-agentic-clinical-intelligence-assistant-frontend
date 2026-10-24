# Development Guidelines, Coding Standards & Rules
## ClinIQ: Frontend & Full-Stack Development Rules

---

## 1. Code Standards & Conventions

### 1.1 TypeScript & Angular Standards
* **Angular Version:** Strict adherence to Angular 19+ best practices. Always prefer **Standalone Components**, directives, and pipes. Do not introduce legacy `NgModule` declarations unless strictly necessary for third-party compatibility.
* **Strict Type Checking:** Enable `"strict": true` in `tsconfig.json`. Explicitly declare return types on all public service methods and component interfaces. Avoid using `any`; define explicit interfaces in `core/models/`.
* **Reactivity Model:**
  * Use Angular **Signals** (`signal`, `computed`, `effect`) for localized state and UI-reactive values.
  * Use **RxJS Observables** with async pipes (`| async`) or `takeUntilDestroyed()` for event streams and HTTP requests. Never leave open subscriptions that cause memory leaks.
* **Component Encapsulation:**
  * Keep components modular with a single responsibility.
  * Maximum recommended lines of code per component: TypeScript $\le 250$ lines, HTML $\le 150$ lines.
  * Separate styles into dedicated `.scss` files matching the component name.

### 1.2 Styling & Design Rules
* **SCSS & CSS Structure:**
  * Use design tokens defined in `styles.scss` for colors, spacing, typography, and border radiuses.
  * Do not hardcode ad-hoc hex colors or magic numbers inside component SCSS files; always reference theme variables (e.g. `var(--primary-600)`, `var(--slate-800)`).
### 1.3 Physician Prescription & Directives Standards
* **Clinical Autonomy & Physician Wisdom:** Prescription values must never be forcefully automated or locked against physician edits. Clinicians retain absolute authority to adjust medication names, dosages, frequencies, and durations.
* **Patient Safety Review Alert:** The prescription dialog must always feature the prominent safety notice ("Review dosage, contraindications, allergies, and interactions before signing") to prevent clinical oversights.
* **SOAP Synchronization:** Any prescription edits confirmed by the doctor must immediately reflect in the SOAP Report tab without requiring page refresh, and be included in any patient-shared copies.

---

## 2. Security & Compliance Rules (PHI & HIPAA Guidelines)

> [!CAUTION]
> Medical and clinical data contains Protected Health Information (PHI). Strict safeguards must be enforced across all layers.

1. **No Sensitive Data in Logs:** Never log raw audio blobs, unmasked patient identifiers, full OTP codes, or clinical transcripts to `console.log()` in production builds.
2. **Local Storage Restrictions:** Do not store plain-text clinical diagnoses or unencrypted health records in browser `localStorage` or `sessionStorage`. Store only session JWT tokens with finite expiration.
3. **Audio Stream Teardown:** Always explicitly call `MediaStreamTrack.stop()` when disconnecting or navigating away from the Doctor Consultation room to prevent background microphone listening.
4. **HTTPS Enforced:** All production API communications must enforce TLS 1.3 encryption in transit.
5. **Secure Context Verification for Media Devices:** Live hardware recording (`getUserMedia`, `getDisplayMedia`) must always inspect `window.isSecureContext` and provide graceful non-secure fallback (`FILE_UPLOAD` channel or setup guidance) when accessed via unencrypted IP addresses. Never execute `navigator.mediaDevices` calls within `FILE_UPLOAD` workflows.

---

## 3. Git Workflow & Contribution Rules

### 3.1 Branching Model
* `main`: Production-ready release branch. Directly committing to `main` is restricted.
* `develop`: Integration branch for active feature sprints.
* `feature/<feature-name>`: Feature branch created from `develop`.
* `fix/<bug-name>`: Bug fix branch created from `develop`.
* `hotfix/<hotfix-name>`: Urgent production patch created from `main`.

### 3.2 Commit Message Standard (Conventional Commits)
Format: `<type>(<scope>): <short summary>`
* `feat(doctor)`: Add live waveform visualizer to consultation room
* `fix(auth)`: Correct OTP countdown timer reset on resend
* `refactor(audio)`: Migrate AudioService to use Angular Signals
* `docs(prd)`: Update clinical decision support requirements
* `test(scheduling)`: Add unit tests for slot selection validator

---

## 4. Error Handling & User Feedback Rules

* **Graceful Degradation:** In case of backend connection drops, display non-intrusive toast notifications with retry buttons rather than blank screens or unhandled exceptions.
* **Loading States:** Every asynchronous action (audio processing, diagnosis retrieval, report generation, slot fetching) must provide clear skeleton loaders or spinner indicators with appropriate accessibility labels (`aria-busy="true"`).
* **Defensive Form Submissions:** Disable submit buttons immediately upon click to prevent accidental double submissions (e.g., booking a doctor's slot twice).
* **Print & Export Fidelity Rule:** Print views must strictly isolate clinical artifacts (SOAP reports, vitals banners, prescription directives) under `@media print`, hiding all navigational headers, sidebars, interactive edit buttons, and transient toast alerts. Exported PDFs must include official doctor signatures, patient demographics, and complete prescription directive breakdowns.
* **Polymorphic Data Normalization Rule:** When parsing clinical AI suggestions or dynamic prompt lists, never assume single schema property existence (e.g. `s.description ? s.title : s.title`). Always provide robust priority-fallback chains resolving `s.text`, `s.title — s.description`, `s.suggestion`, and `s.actionText`, and preserve existing tags/classes to prevent blank rendering across session transitions.
* **Clinical Vitals Formatting Rule:** Never render raw objects, stringified JSON, or raw braces (`{}`) in user-facing clinical cards (e.g. KEY FINDINGS or SOAP objective). All vitals must be parsed through `formatVitalsDisplay`, checking for non-empty keys and returning formatted strings (`BP: 120/80 mmHg · HR: 72 bpm`). In JavaScript, always verify `Object.keys(v).length > 0` rather than relying on truthy object checks (`v || default`) to avoid treating `{}` as truthy.
* **Dynamic CDS Tab Processing Rule:** All 5 CDS tabs (Clinical Decision, Confidence, Follow-up, Medicines, SOAP Report) must dynamically adapt to active session dialogue and patient presentation. Never hardcode static placeholder patients (e.g. Marcus Delgado) or locked confidence scores (58%) into getters without condition-specific fallback synthesizers. Ensure `isSoapManuallyEdited` tracks manual doctor overrides so automated updates from fresh audio recordings or session switches update `effectiveSoapReport` smoothly without being blocked by stale cached drafts.
* **Doctor Dashboard Reload Resilience Rule:** The clinician dashboard must never render an empty/blank view or 0 appointments upon page reload. `AppointmentService` must initialize state synchronously from `localStorage` (`cliniq_patients_cache`) during construction, and `DoctorDashboardComponent` must persist and restore active consultation state via `sessionStorage` (`cliniq_doctor_view_mode`, `cliniq_doctor_active_visit`). Every registered doctor ID (such as `DOC-008`) must be declared in both frontend doctors signals and backend databases, paired with intelligent department/triage fallbacks.

---

## 5. Testing & Quality Assurance Rules

* **Unit Testing:** Maintain unit test coverage for core services (`AuthService`, `AudioService`, `ConsultationService`) using Jasmine / Karma or Vitest.
* **Linting & Code Quality:** Run `npm run lint` before opening pull requests; code must pass without errors or unresolved type warnings.

---

## 6. Mandatory Documentation Synchronization Rule

Whenever making code changes, refactoring components, or adding new features:
* **Always update the corresponding documentation files in `docs/`:**
  * `PRD.md`: Feature requirements, user personas, workflows.
  * `ARCHITECTURE.md`: Components, signals, state, data flows.
  * `RULES.md`: Coding standards, security guidelines.
  * `KNOWLEDGE.md`: Clinical domain context, RAG sources, STT models.
  * `DESIGN.md`: UI tokens, components, layouts, styling.
  * `TASKS.md`: Task tracking, sprint progress, and backlog items.
  * `MEMORY.md`: ADRs, environment configs, runbooks.

