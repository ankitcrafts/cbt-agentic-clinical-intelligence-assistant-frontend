import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { RecordingService } from '../../../core/services/recording.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { PdfExportService } from '../../../core/services/pdf-export.service';
import { RecordedSessionItem } from '../../../core/models/recording.model';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  mockData = inject(MockDataService);
  recordingService = inject(RecordingService);
  appointmentService = inject(AppointmentService);
  pdfExportService = inject(PdfExportService);
  http = inject(HttpClient);

  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;

  // View state: 'queue' (Schedule & Patient List) | 'consultation' (Active Consultation View)
  viewMode: 'queue' | 'consultation' | string = 'queue';

  // Right column state in Consultation view:
  // 'suggestions' -> Image 4 (Patient Card + AI Suggestions + Run Clinical Analysis button)
  // 'analysis'    -> Image 3 (5-Tab Clinical Intelligence Support: Analysis & Summary, Clinical Decision, Medicines, Confidence, SOAP Report)
  rightPanelMode: 'suggestions' | 'analysis' = 'suggestions';

  searchTerm: string = '';
  statusFilter: string = 'ALL';

  isPlayingPreview = false;
  activePlayingSessionId: string | null = null;
  activePlayingAudioUrl: string | null = null;

  // Doctor Header Details (Dynamic based on authenticated user)
  get doctorGreeting(): string {
    const user = this.authService.currentUser();
    const name = user?.name || 'Doctor';
    return `Good morning, ${name.startsWith('Dr.') || name.startsWith('Doctor') ? name : 'Dr. ' + name}`;
  }

  todayDateFormatted = 'Wednesday, August 13';

  get hospitalInfo(): string {
    const user = this.authService.currentUser();
    const dept = user?.department || 'Cardiology';
    const id = user?.id ? `ID: ${user.id} · ` : '';
    return `${id}${dept} · St. Mercy Hospital`;
  }

  dutyStatus = 'On duty';

  get doctorInitials(): string {
    const user = this.authService.currentUser();
    return user?.avatar_initials || 'DOC';
  }

  get currentDoctorUser() {
    return this.authService.currentUser();
  }

  get currentDoctorName(): string {
    return this.authService.currentUser()?.name || 'Dr. Yuki Tanaka';
  }

  get currentDoctorId(): string {
    return this.authService.currentUser()?.id || 'DOC-001';
  }

  // Dynamic Patient Queue / Schedule Data from AppointmentService
  get patientsQueue() {
    const user = this.authService.currentUser();
    const docName = user?.name || 'Dr. Yuki Tanaka';
    const docId = user?.id;
    const queue = this.appointmentService.getDoctorQueue(docName, docId);

    return queue.map(p => ({
      id: p.id,
      name: p.name,
      initials: p.initials,
      age: p.age,
      gender: p.gender,
      demographics: p.demographics,
      time: p.assignedTimeSlot || '09:00 AM',
      duration: p.assignedDuration || '30 min',
      visitType: p.visitType,
      reason: p.reason,
      condition: p.condition,
      status: p.arrivalStatus === 'IN_CONSULTATION' ? 'IN_PROGRESS' : (p.arrivalStatus === 'ARRIVED' ? 'WAITING' : 'SCHEDULED'),
      statusLabel: p.arrivalStatus === 'IN_CONSULTATION' ? 'In Progress' : (p.arrivalStatus === 'ARRIVED' ? 'Waiting' : 'Scheduled'),
      lastVisit: p.lastVisit || '—',
      vitals: p.vitals || { bp: '120/80 mmHg', hr: '72 bpm', pain: '0/10' },
      isPreferredDoctorChoice: p.isPreferredDoctorChoice,
      preferredDoctorName: p.preferredDoctorName
    }));
  }

  // Active Consultation Details
  visitDetails: any = {
    patientName: 'Anya Kowalski',
    visitId: '#00673920',
    initials: 'AK',
    demographics: '29F · #00673920',
    visitType: 'New Patient',
    reason: 'Chest tightness, shortness of breath on exertion',
    condition: 'New presentation',
    lastVisit: '—',
    date: 'Aug 13, 2026',
    time: '11:00',
    duration: '45 min'
  };

  // Image 4: AI Suggestions List (Dynamic per patient)
  aiSuggestionsList: any[] = [];

  // Image 3: 5-Tab CDS Active Tab
  activeTab: 'analysis' | 'clinical' | 'medicines' | 'confidence' | 'soap' = 'analysis';

  // Live Transcript Exchanges (Dynamic per patient)
  transcriptExchanges: any[] = [];

  // Interactive SOAP Editing & Reframing State
  editedSoapReport: { subjective: string; objective: string; assessment: string; plan: string } | null = null;
  activeEditSection: 'subjective' | 'objective' | 'assessment' | 'plan' | null = null;
  sectionEditText: string = '';
  editReasonText: string = '';
  isReframing: boolean = false;
  isSavingFeedback: boolean = false;
  showPatientPreviewModal: boolean = false;
  patientSummaryText: string = '';
  saveStatusMessage: string | null = null;
  savedFeedbackId: string | null = null;

  // Real-time Parallel Sync with Patient Portal
  isSharingSoap: boolean = false;
  isSoapShared: boolean = false;
  soapShareMessage: string | null = null;

  // Multi-Turn Follow-Up & Dynamic Confidence Enhancement (<70% -> Follow-up -> >=70%)
  isFollowUpCompleted: boolean = false;
  isFollowUpLoading: boolean = false;
  activeFollowUpNotice: string | null = null;
  answeredQuestionIds: Set<string> = new Set<string>();
  activeInquiryQuestion: any = null;

  // Guideline-Based Follow-Up Questions (Matching Figma Image 1)
  guidelineFollowUpQuestionsList: Array<{
    id: string;
    question: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    priorityClass: string;
    asked: boolean;
    answered: boolean;
    doctorSnippet: string;
    patientSnippet: string;
  }> = [
      {
        id: 'fq-1',
        question: 'Where exactly is the headache — frontal, occipital, or diffuse? Any neck stiffness?',
        priority: 'HIGH',
        priorityClass: 'priority-high',
        asked: false,
        answered: false,
        doctorSnippet: 'Where exactly is the headache located, Marcus? And do you notice any neck stiffness or throbbing?',
        patientSnippet: 'It is primarily across my forehead and both temples, like a tight band pressing around my head. No neck stiffness.'
      },
      {
        id: 'fq-2',
        question: 'Do you see visual changes, flashing lights, or blind spots before onset?',
        priority: 'HIGH',
        priorityClass: 'priority-high',
        asked: false,
        answered: false,
        doctorSnippet: 'Do you ever experience visual disturbances, flashing lights, blind spots, or nausea before or during the headache?',
        patientSnippet: 'No visual changes, no flashing lights, and no nausea at all.'
      },
      {
        id: 'fq-3',
        question: 'How many caffeinated drinks do you typically have per day?',
        priority: 'MEDIUM',
        priorityClass: 'priority-medium',
        asked: false,
        answered: false,
        doctorSnippet: 'How much coffee, tea, or energy drinks do you consume on a typical day?',
        patientSnippet: 'I drink about 3 to 4 large mugs of strong coffee daily, mostly in the morning and early afternoon.'
      },
      {
        id: 'fq-4',
        question: 'Are you sleeping 7-8 hours? Any difficulty falling or staying asleep?',
        priority: 'MEDIUM',
        priorityClass: 'priority-medium',
        asked: false,
        answered: false,
        doctorSnippet: 'How is your sleep lately? Are you getting 7-8 hours or waking up frequently?',
        patientSnippet: 'I usually get about 6 hours of broken sleep. I wake up around 3 AM sometimes thinking about work deadlines.'
      },
      {
        id: 'fq-5',
        question: 'What does your typical workday look like — screen time, posture, desk setup?',
        priority: 'LOW',
        priorityClass: 'priority-low',
        asked: false,
        answered: false,
        doctorSnippet: 'What does your typical workday look like regarding screen time, posture, and desk ergonomics?',
        patientSnippet: 'I work 8 to 9 hours straight on dual monitors without taking screen breaks, often hunching forward.'
      },
      {
        id: 'fq-6',
        question: 'Has anyone in family had similar recurring headaches?',
        priority: 'LOW',
        priorityClass: 'priority-low',
        asked: false,
        answered: false,
        doctorSnippet: 'Has anyone in your immediate family had similar recurring headaches or migraines?',
        patientSnippet: 'No family history of migraines, neurological conditions, or early aneurysms.'
      }
    ];

  // Patient Consultation Session History (from PostgreSQL DB)
  patientSessions: any[] = [];
  selectedSessionId: string = 'live';

  ngOnInit(): void {
    this.appointmentService.fetchDataFromBackend();
  }

  ngOnDestroy(): void {
    if (this.recordingService.state() === 'RECORDING' || this.recordingService.state() === 'PAUSED') {
      this.recordingService.stopRecording();
    } else {
      this.recordingService.stopMicrophoneTracks();
    }
  }

  get activeSessionNumber(): number {
    return (this.patientSessions?.length || 0) + 1;
  }

  get currentSessionTitle(): string {
    if (this.selectedSessionId === 'live') {
      const num = this.activeSessionNumber;
      const type = this.visitDetails?.visitType || 'Consultation & Review';
      return `Session ${num}: ${type}`;
    }
    const selected = this.patientSessions.find(s => s.id === this.selectedSessionId);
    if (selected) {
      return selected.sessionTitle || `Session ${selected.sessionNumber || 1}: Consultation History`;
    }
    return this.recordingService.sessionTitle() || `Session 1`;
  }

  // Open consultation for selected patient -> switches patient recording context
  openConsultation(patient: any): void {
    const patientId = patient.id.startsWith('#') ? patient.id : '#' + patient.id;

    // Switch patient context in recording service (loads that patient's session or initializes clean)
    this.recordingService.switchPatient(patientId);
    this.transcriptExchanges = [];
    this.patientSessions = [];
    this.selectedSessionId = 'live'; // Always initialize in active live appointment session
    this.editedSoapReport = null;
    this.answeredQuestionIds.clear();
    this.isFollowUpCompleted = false;

    this.visitDetails = {
      patientName: patient.name,
      visitId: patientId,
      initials: patient.initials || 'AK',
      demographics: patient.demographics || `${patient.age}${patient.gender} · ${patient.id}`,
      visitType: patient.visitType || 'Consultation & Review',
      reason: patient.reason || 'Clinical Consultation',
      condition: patient.condition || 'New presentation',
      lastVisit: patient.lastVisit || '—',
      date: 'Aug 13, 2026',
      time: patient.time,
      duration: patient.duration || '30 min'
    };

    // Synchronize mock data state
    const currentEx = this.recordingService.latestExchanges();
    this.mockData.activeConsultation.update(prev => ({
      ...prev,
      id: 'CONS-' + patientId.replace('#', ''),
      patientName: patient.name,
      patientAge: patient.age,
      patientGender: patient.gender === 'M' ? 'Male' : 'Female',
      patientPid: patientId,
      reasonForVisit: patient.reason,
      transcript: currentEx && currentEx.length > 0 ? currentEx.map(e => ({
        speaker: e.isDoctor ? 'Doctor' : 'Patient',
        text: e.text,
        timestamp: e.timestamp || '00:00'
      })) : [],
      wordCount: this.recordingService.latestTranscript() ? this.recordingService.latestTranscript().split(/\s+/).length : 0
    }));

    // Fetch previous consultation sessions from backend database
    this.recordingService.getPatientConsultationSessions(patientId).subscribe({
      next: (sessions) => {
        this.patientSessions = sessions || [];
        // Keep selectedSessionId as 'live' so the doctor can conduct today's appointment (Session N+1)
      },
      error: (err) => console.warn('Failed to load consultation sessions for patient:', err)
    });

    // Update patient status to IN_CONSULTATION
    this.appointmentService.updatePatient(patientId, { arrivalStatus: 'IN_CONSULTATION' });

    // Start with Patient Card + AI Suggestions + Run Clinical Analysis button
    this.rightPanelMode = 'suggestions';
    this.viewMode = 'consultation';
  }

  selectSession(session: any): void {
    this.selectedSessionId = session.id;
    this.recordingService.loadConsultationSession(session);
    this.transcriptExchanges = session.conversation || [];
    this.editedSoapReport = session.soapReport || session.soap_report || null;
    this.patientSummaryText = '';
    this.answeredQuestionIds.clear();
    this.isFollowUpCompleted = false;
  }

  selectLiveSession(): void {
    this.selectedSessionId = 'live';
    const patientId = this.visitDetails.visitId;
    this.recordingService.switchPatient(patientId);
    this.transcriptExchanges = this.recordingService.latestExchanges() || [];
    this.editedSoapReport = null;
    this.patientSummaryText = '';
    this.answeredQuestionIds.clear();
    this.isFollowUpCompleted = false;
  }

  get canRunClinicalAnalysis(): boolean {
    return this.currentTranscriptExchanges.length > 0 || (!!this.recordingService.latestTranscript() && this.recordingService.latestTranscript().trim().length > 0) || this.currentAISuggestions.length > 0;
  }


  // On clicking "Run Clinical Analysis" -> switches right column to Image 3 (5-Tab CDS Panel)
  runClinicalAnalysis(): void {
    if (!this.canRunClinicalAnalysis) {
      return;
    }
    const exchanges = this.currentTranscriptExchanges;
    if (exchanges && exchanges.length > 0 && !this.recordingService.latestClinicalAnalysis()) {
      const turns = exchanges.map(e => ({
        speaker: e.isDoctor ? 'Doctor' : 'Patient',
        text: e.text
      }));
      this.recordingService.analyzeConversation(turns, this.recordingService.latestTranscript()).subscribe({
        next: (res) => console.log('Clinical analysis generated:', res),
        error: (err) => console.error('Failed to run clinical analysis:', err)
      });
    }
    this.rightPanelMode = 'analysis';
    this.activeTab = 'analysis';
  }

  // Switch back to Suggestions
  backToSuggestions(): void {
    this.rightPanelMode = 'suggestions';
  }

  // Return to Today's Schedule
  backToQueue(): void {
    this.viewMode = 'queue';
  }

  setActiveTab(tab: 'analysis' | 'clinical' | 'medicines' | 'confidence' | 'soap') {
    this.activeTab = tab;
  }

  isDragOver = false;
  activeUploadError: string | null = null;

  // Consultation mode helpers
  showTeleconsultationGuideModal: boolean = false;

  setConsultationMode(mode: 'IN_PERSON' | 'REMOTE_TEAMS' | 'REMOTE_MEET' | 'REMOTE_WHATSAPP' | 'FILE_UPLOAD'): void {
    this.recordingService.setConsultationMode(mode as any);
    this.activeUploadError = null;
  }

  openTeleconsultGuide(): void {
    this.showTeleconsultationGuideModal = true;
  }

  closeTeleconsultGuide(): void {
    this.showTeleconsultationGuideModal = false;
  }

  // Drag & drop file upload handlers for pre-recorded teleconsultations
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = false;
  }

  onFileDropped(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      this.processCallFile(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processCallFile(input.files[0]);
    }
  }

  async processCallFile(file: File): Promise<void> {
    try {
      this.activeUploadError = null;
      const pid = this.visitDetails.visitId || this.mockData.activeConsultation().patientPid || 'P1245';
      const encId = 'CONS-' + pid.replace('#', '');
      await this.recordingService.handleUploadedAudioFile(file, {
        encounterId: encId,
        doctorId: this.currentDoctorId,
        patientId: pid
      });
      // Automatically trigger upload & Deepgram pipeline
      this.uploadRecording();
    } catch (err: any) {
      console.error('File process error:', err);
      this.activeUploadError = err.message || 'Failed to process audio file.';
    }
  }

  // Recording methods
  async startRecording(): Promise<void> {
    try {
      this.activeUploadError = null;
      const pid = this.visitDetails.visitId || this.mockData.activeConsultation().patientPid || 'P1245';
      const encId = 'CONS-' + pid.replace('#', '');
      await this.recordingService.startRecording({
        encounterId: encId,
        doctorId: this.currentDoctorId,
        patientId: pid
      });
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  }

  pauseRecording(): void {
    this.recordingService.pauseRecording();
  }

  resumeRecording(): void {
    this.recordingService.resumeRecording();
  }

  async stopRecording(): Promise<void> {
    const pid = this.visitDetails.visitId || this.mockData.activeConsultation().patientPid || 'P1245';
    const encId = 'CONS-' + pid.replace('#', '');
    await this.recordingService.stopRecording({
      encounterId: encId,
      doctorId: this.currentDoctorId,
      patientId: pid
    });
    // Automatically trigger Google Drive upload & Deepgram transcription
    this.uploadRecording();
  }

  uploadRecording(): void {
    const pid = this.visitDetails.visitId || this.mockData.activeConsultation().patientPid || 'P1245';
    const encId = 'CONS-' + pid.replace('#', '');
    this.recordingService.uploadRecording({
      encounterId: encId,
      doctorId: this.currentDoctorId,
      patientId: pid,
      doctorName: this.currentDoctorName,
      patientName: this.visitDetails.patientName || 'Patient',
      doctorInitials: this.doctorInitials,
      patientInitials: this.visitDetails.initials || 'PT'
    }).subscribe({
      next: (res) => {
        console.log('Google Drive upload & Deepgram transcription success:', res);
        if (res.exchanges && res.exchanges.length > 0) {
          this.transcriptExchanges = res.exchanges;
        }
        this.recordingService.getPatientConsultationSessions(pid).subscribe({
          next: (sessions) => {
            this.patientSessions = sessions || [];
          }
        });
      },
      error: (err) => console.error('Upload & transcription failed:', err)
    });
  }

  retryUpload(): void {
    this.uploadRecording();
  }

  get currentTranscriptExchanges(): any[] {
    const live = this.recordingService.latestExchanges();
    return live && live.length > 0 ? live : this.transcriptExchanges;
  }

  get currentAISuggestions(): any[] {
    const live = this.recordingService.latestSuggestions();
    if (live && live.length > 0) {
      return live.map((s, idx) => ({
        id: idx + 1,
        type: (s.priority || 'high').toLowerCase(),
        tag: `${s.priority || 'HIGH'} · ${s.category || 'CLINICAL'}`,
        text: s.description ? `${s.title} — ${s.description}` : s.title
      }));
    }
    return this.aiSuggestionsList;
  }

  get isConfidenceBelowThreshold(): boolean {
    return (this.currentConfidenceMetrics?.overallScore ?? 58) < 70;
  }

  get currentGuidelineFollowUpQuestions(): Array<{
    id: string;
    question: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    priorityClass: string;
    asked: boolean;
    answered: boolean;
    doctorSnippet: string;
    patientSnippet: string;
  }> {
    const analysis = this.recordingService.latestClinicalAnalysis();
    const backendQuestions = analysis?.guideline_follow_up_questions || analysis?.guidelineFollowUpQuestions || analysis?.follow_up_questions || analysis?.followUpQuestions;

    if (Array.isArray(backendQuestions) && backendQuestions.length > 0) {
      return backendQuestions.map((q: any, idx: number) => {
        const id = q.id || `fq-${idx + 1}`;
        const rawPriority = (typeof q.priority === 'string' ? q.priority.toUpperCase() : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW';
        const priority: 'HIGH' | 'MEDIUM' | 'LOW' = ['HIGH', 'MEDIUM', 'LOW'].includes(rawPriority) ? rawPriority : 'MEDIUM';
        const isAnswered = this.answeredQuestionIds.has(id) || !!q.answered;
        const isAsked = this.answeredQuestionIds.has(id) || !!q.asked;
        const qText = typeof q === 'string' ? q : (q.question || q.text || '');

        return {
          id,
          question: qText,
          priority,
          priorityClass: priority === 'HIGH' ? 'priority-high' : priority === 'LOW' ? 'priority-low' : 'priority-medium',
          asked: isAsked,
          answered: isAnswered,
          doctorSnippet: q.doctor_snippet || q.doctorSnippet || qText,
          patientSnippet: q.patient_snippet || q.patientSnippet || 'Patient confirmed symptoms and provided pertinent clinical context.'
        };
      });
    }

    return this.guidelineFollowUpQuestionsList.map(q => ({
      ...q,
      asked: this.answeredQuestionIds.has(q.id) || q.asked,
      answered: this.answeredQuestionIds.has(q.id) || q.answered
    }));
  }

  get answeredQuestionsCount(): number {
    return this.currentGuidelineFollowUpQuestions.filter(q => q.answered).length;
  }

  get followUpProgressPercentage(): number {
    const total = this.currentGuidelineFollowUpQuestions.length;
    if (total === 0) return 0;
    return Math.round((this.answeredQuestionsCount / total) * 100);
  }

  get currentClinicalSummary(): string {
    if (this.isFollowUpCompleted) {
      return `Marcus Delgado (42M) presents for cardiology follow-up and investigation of recurrent afternoon headaches. Multi-turn follow-up inquiry confirmed bilateral frontal-temporal pressing/tight-band pain without aura or neurological red flags. Significant lifestyle contributors identified include high caffeine intake (3-4 strong cups/day), prolonged continuous screen time (8-9 hours/day with postural strain), and restricted sleep (6 hours/night). Neurological exam and fundoscopy are normal. Blood pressure remains suboptimally controlled at 138/88 mmHg on Lisinopril 10 mg monotherapy.`;
    }
    const analysis = this.recordingService.latestClinicalAnalysis();
    if (analysis?.summary) {
      if (typeof analysis.summary === 'string') return analysis.summary;
      if (analysis.summary.clinical_summary) return analysis.summary.clinical_summary;
      if (analysis.summary.narrative_summary) return analysis.summary.narrative_summary;
      if (analysis.summary.history_of_present_illness) return `${analysis.summary.chief_complaint || ''} — ${analysis.summary.history_of_present_illness}`;
      return JSON.stringify(analysis.summary);
    }
    return `Patient Marcus Delgado presents for cardiology follow-up. Reports recurring afternoon headaches (~4-5x/week, rated 5-6/10, lasting ~1 hour) since last visit. Adherent to Lisinopril 10 mg daily. Diagnostic confidence is currently 58% (< 70% threshold) due to uncharacterized headache topography and unexplored lifestyle triggers.`;
  }

  get currentKeyFindings(): any[] {
    if (this.isFollowUpCompleted) {
      return [
        { label: 'CHIEF COMPLAINT', value: 'Recurrent Tension Headaches + Stage 1 HTN' },
        { label: 'HEADACHE TOPOGRAPHY', value: 'Bilateral frontal-temporal ("tight band"), No Aura' },
        { label: 'EXACERBATING FACTORS', value: '3-4 cups coffee/day, 8-9h screen time, 6h sleep' },
        { label: 'RED FLAGS', value: 'Ruled Out (Cranial nerves intact, fundoscopy normal)' },
        { label: 'CURRENT VITALS', value: 'BP 138/88 mmHg, HR 72 bpm, Wt 81 kg' },
        { label: 'ADHERENCE', value: 'Lisinopril 10 mg OD (Confirmed compliance)' }
      ];
    }
    const analysis = this.recordingService.latestClinicalAnalysis();
    if (analysis?.summary || analysis?.entities) {
      const findings: any[] = [];
      const s = analysis.summary || {};
      const e = analysis.entities || {};
      if (s.chief_complaint) findings.push({ label: 'CHIEF COMPLAINT', value: s.chief_complaint });
      if (s.duration || s.onset) findings.push({ label: 'DURATION / ONSET', value: s.duration || s.onset });
      if (s.severity) findings.push({ label: 'SEVERITY', value: s.severity });
      if (e.symptoms && Array.isArray(e.symptoms) && e.symptoms.length > 0) {
        findings.push({ label: 'SYMPTOMS', value: e.symptoms.map((x: any) => typeof x === 'string' ? x : x.name || x.symptom).join(', ') });
      }
      if (e.vital_signs || e.vitals) {
        findings.push({ label: 'VITALS', value: typeof e.vital_signs === 'object' ? JSON.stringify(e.vital_signs) : String(e.vital_signs || e.vitals) });
      }
      if (findings.length > 0) return findings;
    }
    return [
      { label: 'CHIEF COMPLAINT', value: 'Recurrent afternoon headaches (4-5x/week)' },
      { label: 'VISIT TYPE', value: 'Follow-up (Cardiology)' },
      { label: 'CONDITION', value: 'Essential Hypertension Stage 1' },
      { label: 'TOPOGRAPHY', value: 'Uncharacterized (Awaiting Follow-up Inquiry)' },
      { label: 'STATUS', value: 'Diagnostic Confidence 58% (< 70% Target)' }
    ];
  }

  get currentIdentifiedIssues(): any[] {
    if (this.isFollowUpCompleted) {
      return [
        { text: 'Tension-Type Headache: Bilateral band-like pain confirmed (89% certainty)', type: 'danger', dotColor: '#ef4444' },
        { text: 'Stage 1 Essential HTN: Suboptimally controlled on Lisinopril 10 mg', type: 'warning', dotColor: '#f59e0b' },
        { text: 'High caffeine consumption (3-4 large mugs/day) triggering afternoon rebound', type: 'warning', dotColor: '#f59e0b' },
        { text: 'Prolonged screen time (8-9h continuous) causing ergonomic neck/eye strain', type: 'warning', dotColor: '#f59e0b' },
        { text: 'Neurological red flags successfully excluded via fundoscopy & cranial nerve exam', type: 'info', dotColor: '#0d9488' }
      ];
    }
    const analysis = this.recordingService.latestClinicalAnalysis();
    if (analysis?.summary?.identified_issues && Array.isArray(analysis.summary.identified_issues)) {
      return analysis.summary.identified_issues.map((it: any) => typeof it === 'string' ? { text: it, type: 'warning', dotColor: '#f59e0b' } : it);
    }
    if (analysis?.entities?.potential_risks && Array.isArray(analysis.entities.potential_risks)) {
      return analysis.entities.potential_risks.map((it: any) => ({ text: typeof it === 'string' ? it : it.risk, type: 'danger', dotColor: '#ef4444' }));
    }
    return [
      { text: 'New recurrent headache pattern without defined topography (Rule out raised ICP)', type: 'danger', dotColor: '#ef4444' },
      { text: 'Essential Hypertension Stage 1 — suboptimally controlled on monotherapy', type: 'warning', dotColor: '#f59e0b' },
      { text: 'Home BP monitoring adherence low (~1x/week)', type: 'warning', dotColor: '#f59e0b' },
      { text: 'Overdue fasting lipid panel and renal function workup', type: 'info', dotColor: '#3b82f6' }
    ];
  }

  get currentDifferentialDiagnoses(): any[] {
    if (this.isFollowUpCompleted) {
      return [
        {
          rank: 1,
          title: 'Tension-Type Headache',
          icdCode: 'G44.2',
          risk: 'high',
          riskLabel: 'high',
          percentage: 89,
          color: '#0d9488',
          description: 'Bilateral frontal-temporal tight-band pattern confirmed without aura. Correlates with 8-9h continuous screen time and poor posture.'
        },
        {
          rank: 2,
          title: 'Essential Hypertension Stage 1',
          icdCode: 'I10',
          risk: 'high',
          riskLabel: 'high',
          percentage: 88,
          color: '#0d9488',
          description: 'Persistent elevated BP (138/88 mmHg) on Lisinopril monotherapy; target <130/80 mmHg.'
        },
        {
          rank: 3,
          title: 'Caffeine-Related / Withdrawal Headache',
          icdCode: 'G44.83',
          risk: 'medium',
          riskLabel: 'medium',
          percentage: 64,
          color: '#f59e0b',
          description: 'Daily intake of 3-4 strong coffees confirmed. Afternoon onset coincides with caffeine half-life and withdrawal curve.'
        },
        {
          rank: 4,
          title: 'White-Coat Hypertension',
          icdCode: 'R03.0',
          risk: 'low',
          riskLabel: 'low',
          percentage: 38,
          color: '#2dd4bf',
          description: 'Home readings infrequent; symptom onset timing points primarily to tension/caffeine.'
        },
        {
          rank: 5,
          title: 'Secondary Hypertension (renal)',
          icdCode: 'I15.1',
          risk: 'low',
          riskLabel: 'low',
          percentage: 18,
          color: '#2dd4bf',
          description: 'No history or signs of renal pathology; routine overdue screening labs ordered.'
        }
      ];
    }
    return [
      {
        rank: 1,
        title: 'Essential Hypertension',
        icdCode: 'I10',
        risk: 'high',
        riskLabel: 'high',
        percentage: 88,
        color: '#0d9488',
        description: 'Persistent elevated BP, on Lisinopril, strong pattern match.'
      },
      {
        rank: 2,
        title: 'Tension-Type Headache',
        icdCode: 'G44.2',
        risk: 'high',
        riskLabel: 'high',
        percentage: 71,
        color: '#0d9488',
        description: 'Afternoon onset, moderate severity, correlates with screen-time pattern.'
      },
      {
        rank: 3,
        title: 'White-Coat Hypertension',
        icdCode: 'R03.0',
        risk: 'medium',
        riskLabel: 'medium',
        percentage: 54,
        color: '#f59e0b',
        description: 'Home readings infrequent; clinic readings consistently higher.'
      },
      {
        rank: 4,
        title: 'Caffeine-Withdrawal Headache',
        icdCode: 'G44.83',
        risk: 'medium',
        riskLabel: 'medium',
        percentage: 45,
        color: '#f59e0b',
        description: 'Timing consistent. Caffeine history not yet confirmed.'
      },
      {
        rank: 5,
        title: 'Secondary Hypertension (renal)',
        icdCode: 'I15.1',
        risk: 'low',
        riskLabel: 'low',
        percentage: 22,
        color: '#2dd4bf',
        description: 'No renal workup documented. Rule out if BP control worsens.'
      }
    ];
  }

  get currentRedFlags(): any[] {
    if (this.isFollowUpCompleted) {
      return [
        {
          severity: 'RESOLVED',
          title: 'Raised ICP / Intracranial pathology ruled out — Cranial nerves intact, fundoscopy normal',
          recommendation: 'Annual neurological check; monitor headache diary'
        },
        {
          severity: 'WARNING',
          title: 'Home BP monitoring adherence low (~1x/week)',
          recommendation: 'Reinforce daily morning/evening log; prescribe connected home cuff'
        },
        {
          severity: 'INFO',
          title: 'Atorvastatin — no recent lipid panel on file',
          recommendation: 'Fasting lipid panel and renal panel ordered for this visit'
        }
      ];
    }
    return [
      {
        severity: 'CRITICAL',
        title: 'New headache at consistent time — rule out raised ICP',
        recommendation: 'Neurological exam & follow-up symptom topography inquiry recommended today'
      },
      {
        severity: 'WARNING',
        title: 'Home BP monitoring adherence low (~1x/week)',
        recommendation: 'Reinforce daily log; consider connected cuff'
      },
      {
        severity: 'INFO',
        title: 'Atorvastatin — no recent lipid panel on file',
        recommendation: 'Order fasting lipid profile at next visit'
      }
    ];
  }

  get currentGuidelineMedicines(): any[] {
    if (this.isFollowUpCompleted) {
      return [
        {
          name: 'Lisinopril',
          drugClass: 'ACE Inhibitor',
          grade: 'Grade A',
          source: 'NICE NG136',
          dosage: '10 mg once daily (Morning)',
          recommendation: 'Maintain current regimen; assess 24h ambulatory BP before increasing dose.',
          warning: 'Monitor eGFR and potassium. Report dry cough or angioedema immediately.'
        },
        {
          name: 'Amlodipine',
          drugClass: 'Calcium Channel Blocker',
          grade: 'Grade A',
          source: 'JNC8 / NICE',
          dosage: '5 mg once daily · Secondary step for uncontrolled BP',
          recommendation: 'Add as step-2 adjunct if systolic remains >140 mmHg at 4-week review.',
          warning: 'Monitor for peripheral pedal oedema.'
        },
        {
          name: 'Propranolol',
          drugClass: 'Beta-blocker',
          grade: 'Grade B',
          source: 'NICE CG150',
          dosage: '40 mg twice daily · Comorbid tension headache prophylaxis',
          recommendation: 'Dual benefit for BP and tension headache prophylaxis if conservative measures fail.',
          warning: 'Contraindicated in bronchial asthma. Check resting heart rate.'
        },
        {
          name: 'Paracetamol',
          drugClass: 'Analgesic',
          grade: 'Grade A',
          source: 'BNF / SIGN',
          dosage: '1000 mg PRN · Max 4g / 24 hours',
          recommendation: 'First-line acute tension headache relief. Avoid using >2 days per week.',
          warning: 'Do not exceed 4g/day. Guard against medication-overuse headache (MOH).'
        }
      ];
    }
    return [
      {
        name: 'Amlodipine',
        drugClass: 'CCB',
        grade: 'Grade A',
        source: 'JNC8',
        dosage: '5 mg once daily · Adjunct for uncontrolled BP',
        recommendation: 'Consider if systolic remains >140 on Lisinopril monotherapy after 8 weeks.',
        warning: 'Monitor for peripheral oedema. No significant interaction with current Rx.'
      },
      {
        name: 'Propranolol',
        drugClass: 'Beta-blocker',
        grade: 'Grade B',
        source: 'NICE CG150',
        dosage: '40 mg twice daily · Comorbid tension headache',
        recommendation: 'Dual benefit for BP and headache prophylaxis. Avoid in asthma.',
        warning: 'Can mask hypoglycaemia. Check contraindications before initiating.'
      },
      {
        name: 'Sumatriptan',
        drugClass: 'Triptan',
        grade: 'Grade B',
        source: 'SIGN 155',
        dosage: '50 mg PRN · Acute headache (migraine not yet excluded)',
        recommendation: 'Hold pending ruling out vascular headache. Do not use if ICP elevated.',
        warning: 'Contraindicated with MAOIs. Use with caution in hypertension.'
      }
    ];
  }

  get currentConfidenceMetrics(): any {
    if (this.isFollowUpCompleted) {
      return {
        overallScore: 86,
        overallLevel: 'High — Validated',
        subtext: 'High clinical certainty achieved after multi-turn follow-up inquiry and guideline cross-referencing.',
        domains: [
          {
            name: 'Symptom completeness',
            percentage: 88,
            description: 'Bilateral tension pattern confirmed, migraine aura & raised ICP ruled out',
            color: '#0d9488'
          },
          {
            name: 'Medical history coverage',
            percentage: 92,
            description: 'Adherence to Lisinopril 10mg verified; baseline Rx documented',
            color: '#0f766e'
          },
          {
            name: 'Lifestyle & social history',
            percentage: 84,
            description: 'Caffeine (3-4 cups/day), 8-9h screen time, and sleep patterns fully explored',
            color: '#0d9488'
          },
          {
            name: 'DDx alignment',
            percentage: 91,
            description: 'High concordance with Tension-Type Headache + Stage 1 Essential HTN',
            color: '#0d9488'
          },
          {
            name: 'Guideline adherence',
            percentage: 89,
            description: 'Aligned with NICE NG136, CG150, and SIGN 155 protocols',
            color: '#0d9488'
          }
        ]
      };
    }
    return {
      overallScore: 58,
      overallLevel: 'Moderate — Review',
      subtext: 'Based on transcript completeness, symptom coverage, and DDx alignment. (Below 70% threshold — follow-up inquiry recommended)',
      domains: [
        {
          name: 'Symptom completeness',
          percentage: 52,
          description: 'Headache characterisation incomplete (quality, location, aura missing)',
          color: '#0d9488'
        },
        {
          name: 'Medical history coverage',
          percentage: 78,
          description: 'Good coverage of current medications and prior diagnoses',
          color: '#0f766e'
        },
        {
          name: 'Lifestyle & social history',
          percentage: 36,
          description: 'Caffeine, sleep, and occupational history not yet explored',
          color: '#ef4444'
        },
        {
          name: 'DDx alignment',
          percentage: 65,
          description: 'Top differentials plausible; secondary screening pending',
          color: '#f59e0b'
        },
        {
          name: 'Guideline adherence',
          percentage: 71,
          description: 'Aligned with NICE NG136 & JNC-8 protocols',
          color: '#0d9488'
        }
      ]
    };
  }

  get currentSoapReport(): any {
    if (this.isFollowUpCompleted) {
      return {
        subjective: `Patient Marcus Delgado, 42M, presents for cardiology follow-up and evaluation of recurring afternoon headaches (~4-5x/week, rated 5-6/10, lasting ~1 hour). Follow-up inquiry clarified: pain is bilateral frontal-temporal with a tight band sensation. Patient denies visual aura, flashing lights, photophobia, nausea, or neck stiffness. Lifestyle history reveals daily consumption of 3-4 large mugs of strong coffee, 8-9 hours of continuous VDU computer work without ergonomic breaks, and 6 hours of broken sleep. Adherent to Lisinopril 10 mg OD and Atorvastatin 20 mg OD; home BP monitoring remains infrequent (~1x/week).`,
        objective: `BP 138/88 mmHg, HR 72 bpm, Wt 81 kg, Temp 36.6 °C, SpO2 98%. Neurological Examination: Cranial nerves II-XII grossly intact; no focal motor or sensory deficits; neck supple with full painless range of motion. Fundoscopy: Sharp optic disc margins bilaterally, no papilloedema or retinal haemorrhages. Current Rx: Lisinopril 10 mg OD, Atorvastatin 20 mg OD.`,
        assessment: `1. Tension-Type Headache (ICD-10 G44.2) — Primary diagnosis confirmed with 89% diagnostic confidence, driven by occupational screen fatigue, poor ergonomic posture, and high caffeine intake. Red flags (raised ICP, intracranial lesion, temporal arteritis) excluded.\n2. Essential Hypertension Stage 1 (ICD-10 I10) — Suboptimally controlled on Lisinopril monotherapy (target <130/80 mmHg).\n3. Secondary Caffeine-Related Triggers (ICD-10 G44.83) — Contributing to afternoon rebound headache cycles.`,
        plan: `1. Medication Management: Continue Lisinopril 10 mg OD. If systolic BP remains >140 mmHg at 4-week check, initiate Amlodipine 5 mg OD adjunct. For acute headache episodes: Paracetamol 1g PRN (max 4g/day, avoid medication-overuse headache).\n2. Lifestyle & Occupational Ergonomics: Gradual caffeine taper (reduce by 1 cup every 3 days to max 1 cup/day); enforce 20-20-20 screen rest rule; adjust monitor height and chair ergonomics; target 7-8 hours sleep.\n3. Diagnostic Monitoring & Labs: Dispense connected home BP monitor for daily morning and evening log; order overdue fasting lipid panel, HbA1c, and renal function tests (eGFR, serum creatinine).\n4. Review & Safety Net: Follow-up appointment in 4-6 weeks with completed BP and headache log. Immediate emergency presentation if sudden 'thunderclap' headache, visual disturbance, or neurological deficit occurs.`
      };
    }
    const analysis = this.recordingService.latestClinicalAnalysis();
    const live = analysis?.soap_report || analysis?.soapReport;
    if (live && live.subjective) {
      return live;
    }
    return {
      subjective: 'Patient Marcus Delgado, 42M, presents for cardiology follow-up. Reports recurring afternoon headaches (~4-5x/week, rated 5-6/10, lasting ~1 hour) since last visit. Adherent to Lisinopril 10 mg daily. Home BP monitoring infrequent (~1x/week). No chest pain, dyspnoea, or palpitations reported.',
      objective: 'Last visit (2026-07-14): BP 138/88 mmHg, HR 72 bpm, Wt 81 kg, Temp 36.6 °C. Current Rx: Lisinopril 10 mg OD, Atorvastatin 20 mg OD. Vitals not yet recorded for today\'s visit.',
      assessment: '1. Essential Hypertension Stage 1 — suboptimally controlled; BP improving but remains above target (<130/80). 2. New symptom: recurrent afternoon headaches — aetiology unclear. DDx includes tension-type headache, caffeine withdrawal, or white-coat effect. Neurological red flag screen pending.',
      plan: '1. Continue Lisinopril 10 mg; consider adding Amlodipine 5 mg if BP >140 systolic at next measurement.\n2. Headache workup: neurological exam today; fundoscopy; daily home BP diary.\n3. Lifestyle: caffeine diary, screen-time hygiene, regular sleep schedule.\n4. Labs: fasting lipid panel and renal function (eGFR, creatinine) — overdue.\n5. Follow-up in 6 weeks or sooner if headaches worsen or BP spikes.'
    };
  }

  /**
   * Triggers the comprehensive automated follow-up simulation (Automate button):
   * 1. Appends follow-up exchanges to active session conversation transcript.
   * 2. Marks all guideline follow-up questions answered.
   * 3. Increases Confidence from 58% (<70%) to 86% (>=70%).
   * 4. Updates all 5 CDS tabs and merges comprehensive SOAP note.
   */
  async triggerFollowUpQuestionsFlow(): Promise<void> {
    this.isFollowUpLoading = true;
    this.activeFollowUpNotice = 'Automating follow-up inquiries & elevating Diagnostic Confidence to 86%...';

    // Simulate real audio/dialogue progression in session
    await new Promise(resolve => setTimeout(resolve, 800));

    const questions = this.currentGuidelineFollowUpQuestions;
    const patientName = this.visitDetails.patientName || 'Patient';
    const followUpExchanges: any[] = [];

    questions.forEach((q, idx) => {
      const minStart = 12 + Math.floor(idx / 2);
      const secStart = (idx % 2 === 0) ? '15' : '45';
      const secEnd = (idx % 2 === 0) ? '35' : '55';

      followUpExchanges.push({
        speaker: 'Doctor',
        speakerRole: 'Doctor',
        speakerName: 'Dr. Yuki Tanaka',
        isDoctor: true,
        text: q.doctorSnippet || q.question,
        timestamp: `${minStart}:${secStart}`
      });
      followUpExchanges.push({
        speaker: 'Patient',
        speakerRole: 'Patient',
        speakerName: patientName,
        isDoctor: false,
        text: q.patientSnippet || 'Patient acknowledged symptoms and verified clinical details.',
        timestamp: `${minStart}:${secEnd}`
      });

      this.answeredQuestionIds.add(q.id);
      q.asked = true;
      q.answered = true;
    });

    // Mark hardcoded list as answered as well if used
    this.guidelineFollowUpQuestionsList.forEach(q => {
      this.answeredQuestionIds.add(q.id);
      q.asked = true;
      q.answered = true;
    });

    // Append to live exchanges
    const currentEx = this.currentTranscriptExchanges;
    const mergedExchanges = [...currentEx, ...followUpExchanges];
    this.transcriptExchanges = mergedExchanges;
    this.recordingService.latestExchanges.set(mergedExchanges);

    // Mark follow-up completed
    this.isFollowUpCompleted = true;
    this.activeInquiryQuestion = null;
    this.editedSoapReport = null; // Re-sync effective SOAP with newly merged report
    this.isFollowUpLoading = false;
    this.activeFollowUpNotice = 'Follow-up inquiries automated. Diagnostic Confidence updated to 86% (≥ 70%). All 5 tabs & SOAP note updated.';

    // Auto-clear notice after 5 seconds
    setTimeout(() => {
      this.activeFollowUpNotice = null;
    }, 5000);
  }

  /**
   * Starts live verbal inquiry for an individual follow-up question.
   * If the recording is paused or idle, starts/resumes it so doctor & patient speech is recorded into the same session.
   */
  async askSingleFollowUpQuestion(questionItem: any): Promise<void> {
    if (questionItem.answered) return;

    this.activeInquiryQuestion = questionItem;
    questionItem.asked = true;

    // Ensure recording is running so speech is captured live in one recording
    if (this.recordingService.state() === 'PAUSED') {
      this.recordingService.resumeRecording();
    } else if (this.recordingService.state() === 'IDLE') {
      try {
        await this.recordingService.startRecording();
      } catch (err) {
        console.warn('Microphone permission or start error:', err);
      }
    }

    this.activeFollowUpNotice = `🎙️ Active Probing Inquiry: "${questionItem.question}" — The microphone is live in this session. Ask the patient now.`;
  }

  /**
   * Marks a live verbal inquiry completed once doctor and patient have spoken.
   * Keeps recording continuous in the same session.
   */
  completeSingleInquiry(questionItem: any): void {
    if (!questionItem) return;
    questionItem.answered = true;
    this.answeredQuestionIds.add(questionItem.id);
    this.activeInquiryQuestion = null;

    const allQuestions = this.currentGuidelineFollowUpQuestions;
    const answeredCount = allQuestions.filter(q => q.answered).length;
    if (answeredCount >= 2 || questionItem.priority === 'HIGH') {
      this.isFollowUpCompleted = true;
      this.editedSoapReport = null;
    }

    this.activeFollowUpNotice = `Inquiry marked answered in active consultation session.`;
    setTimeout(() => {
      this.activeFollowUpNotice = null;
    }, 4000);
  }

  /**
   * Cancels the active live inquiry prompt without marking it answered.
   */
  cancelSingleInquiry(): void {
    this.activeInquiryQuestion = null;
  }

  /**
   * Resets consultation back to initial presentation state (58% confidence < 70%).
   */
  resetConsultationRound(): void {
    this.isFollowUpCompleted = false;
    this.activeInquiryQuestion = null;
    this.editedSoapReport = null;
    this.answeredQuestionIds.clear();
    this.guidelineFollowUpQuestionsList.forEach(q => {
      q.asked = false;
      q.answered = false;
    });
    // Restore base exchanges (first 10 exchanges)
    const base = this.currentTranscriptExchanges.slice(0, 10);
    this.transcriptExchanges = base;
    this.recordingService.latestExchanges.set(base);
    this.activeFollowUpNotice = 'Consultation round reset to initial presentation (Confidence: 58%).';
    setTimeout(() => {
      this.activeFollowUpNotice = null;
    }, 3000);
  }

  exportSoapPdf(): void {
    this.activeTab = 'soap';
    const p = this.visitDetails;
    const docUser = this.authService.currentUser();
    const docName = docUser?.name || 'Dr. Yuki Tanaka';
    const docId = docUser?.id || 'DOC-001';
    const dept = docUser?.department || 'Cardiology';
    const patId = p?.visitId || '#00847261';

    this.pdfExportService.exportSoapNotePdf({
      patientName: p?.patientName || 'Ranjana Kumari',
      patientId: patId,
      demographics: p?.demographics || '42F',
      age: p?.age || 42,
      gender: p?.gender || 'Female',
      doctorName: docName,
      doctorId: docId,
      doctorSpecialty: `${dept} / Specialist`,
      encounterId: `ENC-${patId.replace('#', '')}-${Date.now().toString().slice(-4)}`,
      consultationDate: p?.date || new Date().toISOString().split('T')[0],
      reason: p?.reason || 'Clinical Consultation',
      condition: p?.condition || 'Under Evaluation',
      vitals: p?.vitals || { bp: '120/80 mmHg', hr: '72 bpm', temp: '36.6 °C', weight: '75 kg', spo2: '98%' },
      soap: this.effectiveSoapReport
    });
  }

  printSoapNote(): void {
    this.activeTab = 'soap';
    setTimeout(() => {
      window.print();
    }, 50);
  }

  async shareSoapWithPatient(): Promise<void> {
    this.isSharingSoap = true;
    this.soapShareMessage = null;

    const patientId = this.visitDetails?.visitId || '#00847261';
    const docUser = this.authService.currentUser();
    const docName = docUser?.name || 'Dr. Yuki Tanaka';
    const docId = docUser?.id || 'DOC-001';
    const encounterId = `ENC-${patientId.replace('#', '')}-${Date.now().toString().slice(-4)}`;

    try {
      const res = await this.appointmentService.shareSoapReportWithPatient(
        patientId,
        this.effectiveSoapReport,
        docName,
        docId,
        encounterId
      );

      this.isSharingSoap = false;
      this.isSoapShared = true;
      this.soapShareMessage = `Official SOAP Report successfully shared with ${this.visitDetails.patientName || 'patient'}. The patient's portal (Follow-up Alerts, Medical Records, Prescriptions) is now updated with this SOAP note.`;

      // Also persist to recording feedback database
      this.saveFinalSOAPToDatabase();
    } catch (err) {
      this.isSharingSoap = false;
      this.soapShareMessage = 'Failed to share SOAP report with patient.';
      console.error('Error sharing SOAP report with patient:', err);
    }
  }

  get effectiveSoapReport(): { subjective: string; objective: string; assessment: string; plan: string } {
    if (!this.editedSoapReport) {
      const base = this.currentSoapReport;
      this.editedSoapReport = {
        subjective: base.subjective || '',
        objective: base.objective || '',
        assessment: base.assessment || '',
        plan: base.plan || ''
      };
    }
    return this.editedSoapReport;
  }

  startEditSection(section: 'subjective' | 'objective' | 'assessment' | 'plan'): void {
    this.activeEditSection = section;
    this.sectionEditText = this.effectiveSoapReport[section];
    this.editReasonText = '';
  }

  cancelEditSection(): void {
    this.activeEditSection = null;
    this.sectionEditText = '';
    this.editReasonText = '';
  }

  saveManualSectionEdit(): void {
    if (this.activeEditSection) {
      this.effectiveSoapReport[this.activeEditSection] = this.sectionEditText;
      this.saveStatusMessage = `Updated ${this.activeEditSection.toUpperCase()} section locally. Click "Finalize & Save to DB" to persist changes.`;
      this.activeEditSection = null;
    }
  }

  triggerAIReframe(section: 'subjective' | 'objective' | 'assessment' | 'plan'): void {
    if (!this.editReasonText.trim()) {
      alert('Please enter a clinical edit instruction or reason for AI reframing.');
      return;
    }
    this.isReframing = true;
    const original = this.effectiveSoapReport[section];
    const fullSoap = { ...this.effectiveSoapReport };

    this.recordingService.reframeSOAPSection(section, original, this.editReasonText, fullSoap).subscribe({
      next: (res) => {
        this.isReframing = false;
        if (res.reframed_text) {
          this.effectiveSoapReport[section] = res.reframed_text;
        }
        if (res.patient_summary) {
          this.patientSummaryText = res.patient_summary;
        }
        this.saveStatusMessage = `Reframed ${section.toUpperCase()} section with AI based on doctor instructions.`;
        this.activeEditSection = null;
      },
      error: (err) => {
        this.isReframing = false;
        console.error('SOAP reframing error:', err);
        alert('Failed to reframe section with AI. Please check server connection.');
      }
    });
  }

  openPatientSummaryModal(): void {
    if (!this.patientSummaryText) {
      // Trigger AI patient summary generation
      this.recordingService.reframeSOAPSection('all', 'SOAP Note Summary', 'Generate patient friendly summary', this.effectiveSoapReport).subscribe({
        next: (res) => {
          if (res.patient_summary) {
            this.patientSummaryText = res.patient_summary;
          } else {
            this.patientSummaryText = `• Discussed symptoms regarding ${this.visitDetails.reason}.\n• Evaluated current vital signs and medical history.\n• Continuing recommended treatment plan and follow-up as advised.`;
          }
          this.showPatientPreviewModal = true;
        },
        error: () => {
          this.patientSummaryText = `• Discussed symptoms regarding ${this.visitDetails.reason}.\n• Evaluated current vital signs and medical history.\n• Continuing recommended treatment plan and follow-up as advised.`;
          this.showPatientPreviewModal = true;
        }
      });
    } else {
      this.showPatientPreviewModal = true;
    }
  }

  closePatientSummaryModal(): void {
    this.showPatientPreviewModal = false;
  }

  saveFinalSOAPToDatabase(): void {
    this.isSavingFeedback = true;
    this.saveStatusMessage = null;

    const payload = {
      encounter_id: this.visitDetails.visitId || `ENC-${Date.now()}`,
      doctor_id: this.currentDoctorId,
      doctor_name: this.currentDoctorName,
      patient_id: this.visitDetails.visitId,
      original_soap: this.currentSoapReport,
      edited_soap: this.effectiveSoapReport,
      edit_reason: this.editReasonText || 'Doctor finalized SOAP note review',
      edited_section: this.activeEditSection || 'all',
      patient_summary: this.patientSummaryText,
      is_finalized: true
    };

    this.recordingService.saveSOAPFeedback(payload).subscribe({
      next: (res) => {
        this.isSavingFeedback = false;
        this.savedFeedbackId = res.id;
        this.saveStatusMessage = `SOAP Report & Doctor Feedback persisted to database successfully (ID: ${res.id}).`;
        if (res.patientSummary) {
          this.patientSummaryText = res.patientSummary;
        }
        if (this.visitDetails?.visitId) {
          this.appointmentService.updatePatient(this.visitDetails.visitId, {
            arrivalStatus: 'COMPLETED',
            lastVisit: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          });
        }
      },
      error: (err) => {
        this.isSavingFeedback = false;
        console.error('Save SOAP feedback error:', err);
        this.saveStatusMessage = 'Error saving SOAP feedback to database.';
      }
    });
  }

  // Close and Complete Consultation Session
  isClosingConsultation = false;
  closeSuccessNotification: string | null = null;

  async closeAndCompleteConsultation(): Promise<void> {
    if (this.isClosingConsultation) return;
    this.isClosingConsultation = true;
    this.closeSuccessNotification = null;

    const patientId = this.visitDetails.visitId || '#00847261';
    const docName = this.currentDoctorName;
    const docId = this.currentDoctorId;
    const sessionNum = (this.patientSessions?.length || 0) + 1;
    const sessionTitleStr = `Session ${sessionNum}: ${this.visitDetails.reason || 'Consultation & Review'}`;
    const todayDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    try {
      // 1. If there is an unsaved recording or active session, stop it cleanly
      if (this.recordingService.state() === 'RECORDING' || this.recordingService.state() === 'PAUSED') {
        await this.recordingService.stopRecording({
          encounterId: 'CONS-' + patientId.replace('#', '') + '-' + sessionNum,
          doctorId: docId,
          patientId: patientId
        });
      }

      // 2. Prepare finalized session payload
      const currentEx = this.currentTranscriptExchanges;
      const transcriptText = this.recordingService.latestTranscript() || currentEx.map(e => `${e.speaker}: ${e.text}`).join('\n');
      const clinicalAnalysisData = this.recordingService.latestClinicalAnalysis();
      const soapData = this.currentSoapReport;
      const suggestionsData = this.currentAISuggestions;

      const newSessionRecord = {
        id: `sess-${patientId.replace('#', '')}-${sessionNum}-${Date.now().toString().slice(-4)}`,
        patientId: patientId,
        patientName: this.visitDetails.patientName,
        doctorId: docId,
        doctorName: docName,
        encounterId: `CONS-${patientId.replace('#', '')}-${sessionNum}`,
        sessionNumber: sessionNum,
        sessionTitle: sessionTitleStr,
        appointmentDate: new Date().toISOString(),
        transcript: transcriptText,
        conversation: currentEx,
        aiSuggestions: suggestionsData,
        clinicalAnalysis: clinicalAnalysisData,
        soapReport: soapData,
        durationSeconds: this.recordingService.durationSeconds() || 0,
        status: 'COMPLETED',
        consultationMode: this.recordingService.consultationMode(),
        audioSource: this.recordingService.audioSourceType(),
        gdriveWebViewLink: this.recordingService.gdriveWebViewLink()
      };

      // 3. Post session to Backend REST API
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiBaseUrl}/api/scheduling/patients/${encodeURIComponent(patientId)}/sessions`, {
            session_number: sessionNum,
            session_title: sessionTitleStr,
            doctor_id: docId,
            doctor_name: docName,
            patient_name: this.visitDetails.patientName,
            encounter_id: `CONS-${patientId.replace('#', '')}-${sessionNum}`,
            transcript: transcriptText,
            conversation: currentEx,
            ai_suggestions: suggestionsData,
            clinical_analysis: clinicalAnalysisData,
            soap_report: soapData,
            duration_seconds: this.recordingService.durationSeconds() || 0,
            status: 'COMPLETED',
            consultation_mode: this.recordingService.consultationMode(),
            audio_source: this.recordingService.audioSourceType()
          })
        );
      } catch (postErr) {
        console.warn('Backend session post fallback:', postErr);
      }

      // Add to local patientSessions list
      this.patientSessions.push(newSessionRecord);

      // 4. Complete consultation on backend and update last visit date
      const res = await this.appointmentService.completeConsultation(patientId, docId, docName);

      this.visitDetails.lastVisit = todayDate;
      this.closeSuccessNotification = `Session ${sessionNum} completed & closed for ${this.visitDetails.patientName}. Next appointment will be Session ${sessionNum + 1}.`;

      // 5. Clean active recording state for this patient
      this.recordingService.clearPatientLiveDraft(patientId);
      this.recordingService.resetState();

      // Return to queue after brief feedback
      setTimeout(() => {
        this.isClosingConsultation = false;
        this.backToQueue();
      }, 1800);
    } catch (err) {
      this.isClosingConsultation = false;
      console.error('Error closing consultation:', err);
      this.closeSuccessNotification = `Session ${sessionNum} closed for ${this.visitDetails.patientName}.`;
      setTimeout(() => this.backToQueue(), 1800);
    }
  }

  get gdriveLink(): string | null {
    return this.recordingService.gdriveWebViewLink();
  }

  get isProcessingAudio(): boolean {
    return this.recordingService.isTranscribing() || this.recordingService.state() === 'UPLOADING' || this.recordingService.state() === 'TRANSCRIBING';
  }

  get latestSession(): RecordedSessionItem | null {
    const sessions = this.recordingService.recordedSessions();
    return sessions.length > 0 ? sessions[sessions.length - 1] : null;
  }

  get latestRecordingUrl(): string | null {
    const latest = this.latestSession;
    if (latest?.audioUrl) {
      return latest.audioUrl;
    }
    return this.recordingService.audioUrl();
  }

  get hasRecordings(): boolean {
    return this.recordingService.recordedSessions().length > 0 || (!!this.recordingService.audioUrl() && this.recordingService.state() !== 'IDLE');
  }

  downloadRecording(): void {
    const latest = this.latestSession;
    if (latest) {
      this.recordingService.downloadSessionItem(latest);
    } else {
      this.recordingService.downloadRecording();
    }
  }

  togglePreviewPlayback(): void {
    const audioEl = this.audioPlayerRef?.nativeElement;
    const latestUrl = this.latestRecordingUrl;
    if (!audioEl || !latestUrl) return;

    const latest = this.latestSession;
    const isLatestActive = !this.activePlayingSessionId || (latest && this.activePlayingSessionId === latest.id);

    if (this.isPlayingPreview && isLatestActive) {
      audioEl.pause();
      this.isPlayingPreview = false;
      this.activePlayingSessionId = null;
    } else {
      this.activePlayingSessionId = latest ? latest.id : 'latest';
      this.activePlayingAudioUrl = latestUrl;
      setTimeout(() => {
        audioEl.load();
        audioEl.play().then(() => {
          this.isPlayingPreview = true;
        }).catch(err => {
          console.error('Playback error:', err);
          this.isPlayingPreview = false;
        });
      }, 50);
    }
  }

  playSessionPreview(session: RecordedSessionItem): void {
    const audioEl = this.audioPlayerRef?.nativeElement;
    if (!audioEl) return;

    if (this.activePlayingSessionId === session.id && this.isPlayingPreview) {
      audioEl.pause();
      this.isPlayingPreview = false;
      this.activePlayingSessionId = null;
    } else {
      this.activePlayingSessionId = session.id;
      this.activePlayingAudioUrl = session.audioUrl;
      setTimeout(() => {
        audioEl.play().then(() => {
          this.isPlayingPreview = true;
        }).catch(err => console.error('Playback error:', err));
      }, 50);
    }
  }

  downloadSession(session: RecordedSessionItem): void {
    this.recordingService.downloadSessionItem(session);
  }

  uploadSession(session: RecordedSessionItem): void {
    this.recordingService.uploadSessionItem(session).subscribe({
      next: (res) => console.log('Session upload success:', res),
      error: (err) => console.error('Session upload error:', err)
    });
  }

  uploadAllSessions(): void {
    const pending = this.recordingService.recordedSessions().filter(s => s.status !== 'UPLOADED');
    pending.forEach(s => this.uploadSession(s));
  }

  deleteSession(sessionId: string): void {
    if (this.activePlayingSessionId === sessionId) {
      const audioEl = this.audioPlayerRef?.nativeElement;
      if (audioEl) {
        audioEl.pause();
      }
      this.isPlayingPreview = false;
      this.activePlayingSessionId = null;
    }
    this.recordingService.deleteSession(sessionId);
  }

  clearAllSessions(): void {
    const audioEl = this.audioPlayerRef?.nativeElement;
    if (audioEl) {
      audioEl.pause();
    }
    this.isPlayingPreview = false;
    this.activePlayingSessionId = null;
    this.recordingService.clearAllSessions();
  }

  deleteCurrentRecording(): void {
    const audioEl = this.audioPlayerRef?.nativeElement;
    if (audioEl) {
      audioEl.pause();
    }
    this.isPlayingPreview = false;
    this.recordingService.deleteCurrentRecording();
  }

  onAudioEnded(): void {
    this.isPlayingPreview = false;
    this.activePlayingSessionId = null;
  }

  get currentState() {
    return this.recordingService.state();
  }

  get formattedTimer(): string {
    return this.recordingService.formatDuration(this.recordingService.durationSeconds());
  }

  get progressPercent(): number {
    const current = this.recordingService.durationSeconds();
    const max = this.recordingService.MAX_DURATION_SECONDS || 1200;
    return Math.min(100, Math.max(0, (current / max) * 100));
  }

  get recordedSessions(): RecordedSessionItem[] {
    return this.recordingService.recordedSessions();
  }

  get hasPendingUploads(): boolean {
    return this.recordedSessions.some(s => s.status !== 'UPLOADED');
  }

  get totalAppointmentsCount(): number {
    return this.patientsQueue.length;
  }

  get inProgressCount(): number {
    return this.patientsQueue.filter(p => p.status === 'IN_PROGRESS').length;
  }

  get waitingCount(): number {
    return this.patientsQueue.filter(p => p.status === 'WAITING').length;
  }

  get remainingCount(): number {
    return this.patientsQueue.filter(p => p.status === 'SCHEDULED').length;
  }
}
