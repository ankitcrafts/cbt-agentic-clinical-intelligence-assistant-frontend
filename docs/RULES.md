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
* **Responsive Layouts:**
  * Mobile-first responsive design using modern CSS Grid and Flexbox.
  * Breakpoints: Mobile ($< 640\text{px}$), Tablet ($640\text{px} - 1024\text{px}$), Desktop ($> 1024\text{px}$).

---

## 2. Security & Compliance Rules (PHI & HIPAA Guidelines)

> [!CAUTION]
> Medical and clinical data contains Protected Health Information (PHI). Strict safeguards must be enforced across all layers.

1. **No Sensitive Data in Logs:** Never log raw audio blobs, unmasked patient identifiers, full OTP codes, or clinical transcripts to `console.log()` in production builds.
2. **Local Storage Restrictions:** Do not store plain-text clinical diagnoses or unencrypted health records in browser `localStorage` or `sessionStorage`. Store only session JWT tokens with finite expiration.
3. **Audio Stream Teardown:** Always explicitly call `MediaStreamTrack.stop()` when disconnecting or navigating away from the Doctor Consultation room to prevent background microphone listening.
4. **HTTPS Enforced:** All production API communications must enforce TLS 1.3 encryption in transit.

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

