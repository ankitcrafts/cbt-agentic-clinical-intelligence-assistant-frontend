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

export interface PrescriptionItem {
  medication: string;
  strength: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: string;
  refills: string | number;
  instructions: string;
  prescribedBy?: string;
  prescribedDate?: string;
}

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

  // Active Consultation Details (Defaulting to Active Patient Marcus Delgado)
  visitDetails: any = {
    patientName: 'Marcus Delgado',
    visitId: '#00847261',
    initials: 'MD',
    demographics: '42M · #00847261',
    visitType: 'Cardiology follow-up',
    reason: 'Hypertension review + new headache complaint',
    condition: 'Hypertension Stage 1',
    lastVisit: 'July 14, 2026',
    date: 'Aug 13, 2026',
    time: '09:00 AM',
    duration: '30 min',
    vitals: { bp: '138/88 mmHg', hr: '72 bpm', pain: '5-6/10', spo2: '98%', temp: '36.6 °C' }
  };

  // Prescription State (Doctor Wisdom & Prescription Directives)
  currentPrescription: PrescriptionItem = {
    medication: 'Lisinopril',
    strength: '10 mg',
    route: 'Oral',
    frequency: 'Once daily',
    duration: '6 weeks',
    quantity: '42 tablets',
    refills: '1',
    instructions: 'Take one tablet every morning with breakfast. Continue daily home blood pressure monitoring.',
    prescribedBy: 'Dr. Yuki Tanaka',
    prescribedDate: 'Aug 13, 2026'
  };

  showPrescriptionModal: boolean = false;
  editPrescriptionForm: PrescriptionItem = { ...this.currentPrescription };
  prescriptionChangeStatus: string = 'No changes made';

  // Image 4: AI Suggestions List (Dynamic per patient)
  aiSuggestionsList: any[] = [];

  // 6-Tab CDS Active Tab
  activeTab: 'analysis' | 'clinical' | 'confidence' | 'followup' | 'medicines' | 'soap' = 'analysis';

  // Live Transcript Exchanges (Dynamic per patient, matching consultation dialog)
  transcriptExchanges: any[] = [
    { isDoctor: true, initials: 'YT', speaker: 'Dr. Yuki Tanaka', text: 'Good morning, Marcus. How have you been feeling since our last visit?' },
    { isDoctor: false, initials: 'MD', speaker: 'Marcus Delgado', text: "Mostly okay, but I've been getting these headaches in the afternoon. Usually around 2 or 3pm." },
    { isDoctor: true, initials: 'YT', speaker: 'Dr. Yuki Tanaka', text: 'How often are these headaches occurring? Daily, a few times a week?' },
    { isDoctor: false, initials: 'MD', speaker: 'Marcus Delgado', text: 'Maybe four or five times a week. They last about an hour.' },
    { isDoctor: true, initials: 'YT', speaker: 'Dr. Yuki Tanaka', text: 'On a scale of 1 to 10, how would you rate the pain?' },
    { isDoctor: false, initials: 'MD', speaker: 'Marcus Delgado', text: 'Maybe a 5 or 6. Uncomfortable but I can still work.' },
    { isDoctor: true, initials: 'YT', speaker: 'Dr. Yuki Tanaka', text: 'Where exactly do you feel the pain? Is it throbbing, sharp, or dull?' },
    { isDoctor: false, initials: 'MD', speaker: 'Marcus Delgado', text: 'Dull pressure, like a tight band around my forehead and temples.' },
    { isDoctor: true, initials: 'YT', speaker: 'Dr. Yuki Tanaka', text: 'Any visual changes, nausea, or sensitivity to light with them?' },
    { isDoctor: false, initials: 'MD', speaker: 'Marcus Delgado', text: 'No, nothing like that. Just the dull ache and afternoon fatigue.' }
  ];

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

    // Switch patient context in recording service
    this.recordingService.switchPatient(patientId);
    this.transcriptExchanges = [];
    this.patientSessions = [];
    this.selectedSessionId = 'live'; // Always initialize in active live appointment session
    this.editedSoapReport = null;
    this.patientSummaryText = '';
    this.answeredQuestionIds.clear();
    this.isFollowUpCompleted = false;
    this.activeInquiryQuestion = null;
    this.aiSuggestionsList = [];
    this.activeFollowUpNotice = null;
    this.currentPrescription = this.getPrescriptionForPatient(patientId, patient.name);
    this.editPrescriptionForm = { ...this.currentPrescription };
    this.prescriptionChangeStatus = 'No changes made';
    this.showPrescriptionModal = false;

    // Clear any previous live draft signals for a 100% fresh start
    this.recordingService.latestTranscript.set('');
    this.recordingService.latestExchanges.set([]);
    this.recordingService.latestSuggestions.set([]);
    this.recordingService.latestClinicalAnalysis.set(null);

    this.visitDetails = {
      patientName: patient.name,
      visitId: patientId,
      initials: patient.initials || 'PT',
      demographics: patient.demographics || `${patient.age}${patient.gender} · ${patient.id}`,
      visitType: patient.visitType || 'Consultation & Review',
      reason: patient.reason || 'Clinical Consultation',
      condition: patient.condition || 'New presentation',
      lastVisit: patient.lastVisit || '—',
      date: 'Aug 13, 2026',
      time: patient.time || '09:00 AM',
      duration: patient.duration || '30 min',
      vitals: patient.vitals || { bp: '120/80 mmHg', hr: '72 bpm', pain: '0/10' }
    };

    // Synchronize mock data state with fresh clean baseline
    this.mockData.activeConsultation.update(prev => ({
      ...prev,
      id: 'CONS-' + patientId.replace('#', ''),
      patientName: patient.name,
      patientAge: patient.age,
      patientGender: patient.gender === 'M' ? 'Male' : 'Female',
      patientPid: patientId,
      reasonForVisit: patient.reason,
      transcript: [],
      wordCount: 0,
      soapNote: {
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      }
    }));

    // Fetch previous consultation sessions from backend database
    this.recordingService.getPatientConsultationSessions(patientId).subscribe({
      next: (sessions) => {
        this.patientSessions = sessions || [];
      },
      error: (err) => console.warn('Failed to load consultation sessions for patient:', err)
    });

    // Update patient status to IN_CONSULTATION
    this.appointmentService.updatePatient(patientId, { arrivalStatus: 'IN_CONSULTATION' });

    // Start with Patient Card + AI Suggestions + Run Clinical Analysis button
    this.rightPanelMode = 'suggestions';
    this.activeTab = 'analysis';
    this.viewMode = 'consultation';
  }

  /**
   * Starts a brand new session for the current patient or active appointment.
   * Completely clears Transcript and all 5 CDS Tabs for a 100% fresh start.
   */
  startNewSession(): void {
    const patientId = this.visitDetails?.visitId;
    if (patientId) {
      this.recordingService.resetPatientState(patientId);
    }
    this.recordingService.resetState();

    this.transcriptExchanges = [];
    this.aiSuggestionsList = [];
    this.selectedSessionId = 'live';
    this.editedSoapReport = null;
    this.patientSummaryText = '';
    this.answeredQuestionIds.clear();
    this.isFollowUpCompleted = false;
    this.activeInquiryQuestion = null;
    this.activeFollowUpNotice = null;

    this.recordingService.latestTranscript.set('');
    this.recordingService.latestExchanges.set([]);
    this.recordingService.latestSuggestions.set([]);
    this.recordingService.latestClinicalAnalysis.set(null);
    this.recordingService.clearAllSessions();

    this.rightPanelMode = 'suggestions';
    this.activeTab = 'analysis';

    if (patientId) {
      this.recordingService.getPatientConsultationSessions(patientId).subscribe({
        next: (sessions) => {
          this.patientSessions = sessions || [];
        }
      });
    }

    this.mockData.activeConsultation.update(prev => ({
      ...prev,
      transcript: [],
      wordCount: 0,
      soapNote: {
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      }
    }));
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

  setActiveTab(tab: 'analysis' | 'clinical' | 'confidence' | 'followup' | 'medicines' | 'soap') {
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
      return `Multi-turn follow-up inquiry completed for ${this.visitDetails.patientName || 'patient'}. Pertinent clinical findings, lifestyle contributors, and symptom characterization confirmed. Vitals and management plan updated accordingly.`;
    }
    const analysis = this.recordingService.latestClinicalAnalysis();
    if (analysis?.summary) {
      if (typeof analysis.summary === 'string') return analysis.summary;
      if (analysis.summary.clinical_summary) return analysis.summary.clinical_summary;
      if (analysis.summary.narrative_summary) return analysis.summary.narrative_summary;
      if (analysis.summary.history_of_present_illness) return `${analysis.summary.chief_complaint || ''} — ${analysis.summary.history_of_present_illness}`;
      return JSON.stringify(analysis.summary);
    }
    return `${this.visitDetails.patientName || 'Patient'} (${this.visitDetails.demographics || '—'}) presents for scheduled ${this.visitDetails.visitType?.toLowerCase() || 'consultation'}. Reason for visit: ${this.visitDetails.reason || 'Clinical review'}. Awaiting consultation audio recording or dialogue transcript to generate live clinical intelligence.`;
  }

  get currentKeyFindings(): any[] {
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
    if (this.isFollowUpCompleted) {
      return [
        { label: 'CHIEF COMPLAINT', value: this.visitDetails.reason || 'Clinical Consultation' },
        { label: 'PATIENT', value: `${this.visitDetails.patientName} (${this.visitDetails.demographics})` },
        { label: 'PROTOCOL STATUS', value: 'Follow-up inquiries addressed' },
        { label: 'DIAGNOSTIC CERTAINTY', value: '86% (≥ 70% target reached)' }
      ];
    }
    return [
      { label: 'CHIEF COMPLAINT', value: this.visitDetails.reason || 'Clinical Consultation' },
      { label: 'VISIT TYPE', value: this.visitDetails.visitType || 'Scheduled Appointment' },
      { label: 'PATIENT DEMOGRAPHICS', value: this.visitDetails.demographics || this.visitDetails.patientName },
      { label: 'SCHEDULED TIME', value: `${this.visitDetails.time || '09:00 AM'} · ${this.visitDetails.duration || '30 min'}` },
      { label: 'SESSION STATUS', value: 'Fresh Session — Ready for Recording' }
    ];
  }

  get currentIdentifiedIssues(): any[] {
    const analysis = this.recordingService.latestClinicalAnalysis();
    if (analysis?.summary?.identified_issues && Array.isArray(analysis.summary.identified_issues)) {
      return analysis.summary.identified_issues.map((it: any) => typeof it === 'string' ? { text: it, type: 'warning', dotColor: '#f59e0b' } : it);
    }
    if (analysis?.entities?.potential_risks && Array.isArray(analysis.entities.potential_risks)) {
      return analysis.entities.potential_risks.map((it: any) => ({ text: typeof it === 'string' ? it : it.risk, type: 'danger', dotColor: '#ef4444' }));
    }
    if (this.isFollowUpCompleted) {
      return [
        { text: `Clinical symptoms verified and addressed during consultation for ${this.visitDetails.patientName}.`, type: 'info', dotColor: '#0d9488' }
      ];
    }
    return [
      { text: `Fresh consultation session initialized for ${this.visitDetails.patientName}. Start recording or upload audio to analyze symptoms and detect potential clinical risks.`, type: 'info', dotColor: '#0d9488' }
    ];
  }

  get currentDifferentialDiagnoses(): any[] {
    const analysis = this.recordingService.latestClinicalAnalysis();
    const rawDiff = analysis?.differential_diagnosis || analysis?.differentialDiagnosis;
    if (Array.isArray(rawDiff) && rawDiff.length > 0) {
      return rawDiff.map((d: any, idx: number) => {
        const pct = Math.round(d.percentage || (d.confidence ? d.confidence * 100 : (d.confidence_score ? d.confidence_score * 100 : 75)));
        const risk = (d.risk || d.risk_level || (pct > 70 ? 'high' : pct > 40 ? 'medium' : 'low')).toLowerCase();
        return {
          rank: idx + 1,
          title: d.title || d.name || d.diagnosis || 'Clinical Assessment',
          icdCode: d.icdCode || d.icd10_code || d.icd_code || 'R69',
          risk: risk,
          riskLabel: risk,
          percentage: pct,
          color: risk === 'high' ? '#0d9488' : risk === 'medium' ? '#f59e0b' : '#2dd4bf',
          description: d.description || d.reason || d.recommended_plan || 'Evaluated based on clinical symptoms and encounter context.'
        };
      });
    }
    if (this.isFollowUpCompleted) {
      return [
        {
          rank: 1,
          title: `${this.visitDetails.reason || 'Clinical Presentation'} (Confirmed)`,
          icdCode: 'R69',
          risk: 'high',
          riskLabel: 'high',
          percentage: 86,
          color: '#0d9488',
          description: `Primary clinical hypothesis verified after protocol inquiries for ${this.visitDetails.patientName}.`
        }
      ];
    }
    return [];
  }

  get currentRedFlags(): any[] {
    const analysis = this.recordingService.latestClinicalAnalysis();
    const flags = analysis?.red_flags || analysis?.redFlags || analysis?.entities?.warning_signs;
    if (Array.isArray(flags) && flags.length > 0) {
      return flags.map((f: any) => typeof f === 'string' ? {
        severity: 'WARNING',
        title: f,
        recommendation: 'Assess clinically during consultation'
      } : {
        severity: f.severity || 'WARNING',
        title: f.title || f.warning || f.sign || 'Clinical warning indicator',
        recommendation: f.recommendation || f.plan || 'Monitor during evaluation'
      });
    }
    if (this.isFollowUpCompleted) {
      return [
        {
          severity: 'RESOLVED',
          title: `Acute red flags ruled out during consultation inquiries for ${this.visitDetails.patientName}`,
          recommendation: 'Maintain standard clinical vigilance and follow-up'
        }
      ];
    }
    return [];
  }

  get currentGuidelineMedicines(): any[] {
    const analysis = this.recordingService.latestClinicalAnalysis();
    const meds = analysis?.guideline_medicines || analysis?.guidelineMedicines || analysis?.medicines;
    if (Array.isArray(meds) && meds.length > 0) {
      return meds.map((m: any) => ({
        name: m.name || m.drug_name || 'Prescription item',
        drugClass: m.drugClass || m.drug_class || m.class || 'Therapeutic Agent',
        grade: m.grade || 'Grade A',
        source: m.source || 'NICE / BNF',
        dosage: m.dosage || m.dose || 'As clinically directed',
        recommendation: m.recommendation || m.clinical_indication || 'Guideline-directed therapy',
        warning: m.warning || m.contraindications || 'Review patient contraindications before prescribing.'
      }));
    }
    return [];
  }

  get currentConfidenceMetrics(): any {
    if (this.isFollowUpCompleted) {
      return {
        overallScore: 86,
        overallLevel: 'High — Validated',
        subtext: `High clinical certainty achieved after protocol inquiry for ${this.visitDetails.patientName}.`,
        domains: [
          { name: 'Symptom completeness', percentage: 88, description: 'Symptom pattern and clinical timeline confirmed', color: '#0d9488' },
          { name: 'Medical history coverage', percentage: 92, description: 'Prior diagnoses and medication adherence documented', color: '#0f766e' },
          { name: 'Lifestyle & social history', percentage: 84, description: 'Workday habits, sleep, and routine triggers fully explored', color: '#0d9488' },
          { name: 'DDx alignment', percentage: 91, description: 'High concordance with clinical presentation', color: '#0d9488' },
          { name: 'Guideline adherence', percentage: 89, description: 'Aligned with evidence-based management protocols', color: '#0d9488' }
        ]
      };
    }
    const analysis = this.recordingService.latestClinicalAnalysis();
    if (analysis?.confidence_metrics || analysis?.confidenceMetrics) {
      return analysis.confidence_metrics || analysis.confidenceMetrics;
    }
    if (this.currentTranscriptExchanges.length > 0) {
      return {
        overallScore: 58,
        overallLevel: 'Moderate — Review',
        subtext: 'Based on transcript completeness, symptom coverage, and DDx alignment. (Below 70% threshold — follow-up inquiry recommended)',
        domains: [
          { name: 'Symptom completeness', percentage: 52, description: 'Symptom characterisation in progress', color: '#0d9488' },
          { name: 'Medical history coverage', percentage: 78, description: 'Baseline health history documented', color: '#0f766e' },
          { name: 'Lifestyle & social history', percentage: 36, description: 'Lifestyle triggers not yet fully explored', color: '#ef4444' },
          { name: 'DDx alignment', percentage: 65, description: 'Differentials plausible; awaiting confirmation', color: '#f59e0b' },
          { name: 'Guideline adherence', percentage: 71, description: 'Standard clinical screening applied', color: '#0d9488' }
        ]
      };
    }
    return {
      overallScore: 0,
      overallLevel: 'Awaiting Audio Recording',
      subtext: 'Diagnostic confidence will be computed in real-time as speech is recorded and clinical symptoms are extracted.',
      domains: []
    };
  }

  get currentSoapReport(): any {
    if (this.isFollowUpCompleted) {
      return {
        subjective: `Patient ${this.visitDetails.patientName || 'Patient'}, ${this.visitDetails.demographics || ''}, presents for scheduled ${this.visitDetails.visitType?.toLowerCase() || 'consultation'}.\nChief complaint / reason for visit: ${this.visitDetails.reason || 'Clinical evaluation'}.\nMulti-turn clinical inquiries completed in session. Patient confirmed pertinent history and symptom timeline without unexpected red-flag symptoms.`,
        objective: `Recorded Vitals: ${this.visitDetails.vitals ? (typeof this.visitDetails.vitals === 'object' ? 'BP ' + (this.visitDetails.vitals.bp || '120/80 mmHg') + ', HR ' + (this.visitDetails.vitals.hr || '72 bpm') : this.visitDetails.vitals) : 'BP 120/80 mmHg, HR 72 bpm, SpO2 98%'}.\nClinical evaluation and physical observation completed.`,
        assessment: `Primary presentation for "${this.visitDetails.reason || 'clinical consultation'}" evaluated with high diagnostic confidence (86%). Relevant clinical guidelines applied.`,
        plan: `1. Continue recommended medical regimen as prescribed.\n2. Maintain symptom and routine lifestyle monitoring.\n3. Scheduled clinical follow-up as indicated.`
      };
    }
    const analysis = this.recordingService.latestClinicalAnalysis();
    const live = analysis?.soap_report || analysis?.soapReport;
    if (live && live.subjective) {
      return live;
    }
    if (this.visitDetails.patientName?.includes('Delgado') || this.visitDetails.visitId?.includes('00847261')) {
      return {
        subjective: `Patient Marcus Delgado (42M) presents for hypertension review and evaluation of new afternoon headaches. Reports headaches occur 4-5 times/week, dull frontal-temporal tightness, pain 5-6/10 lasting ~1 hour. Denies visual changes, nausea, photophobia, palpitations, or shortness of breath.`,
        objective: `Last visit (2026-07-14): BP 138/88 mmHg, HR 72 bpm, Wt 81 kg, Temp 36.6 °C. Current Rx: Lisinopril 10 mg OD, Atorvastatin 20 mg OD. Vitals not yet recorded for today's visit.`,
        assessment: `1. Essential Hypertension Stage 1 — suboptimally controlled; BP improving but remains above target (<130/80). 2. New symptom: recurrent afternoon headaches — aetiology unclear. DDx includes tension-type headache, caffeine withdrawal, or white-coat effect. Neurological red flag screen pending.`,
        plan: `1. Continue Lisinopril 10 mg; consider adding Amlodipine 5 mg if BP >140 systolic at next measurement.
2. Headache workup: neurological exam (today); fundoscopy; daily home BP diary.
3. Lifestyle: caffeine diary, screen-time hygiene, regular sleep schedule.
4. Labs: fasting lipid panel and renal function (eGFR, creatinine) — overdue.
5. Follow-up in 6 weeks or sooner if headaches worsen or BP spikes.`
      };
    }
    return {
      subjective: `Patient ${this.visitDetails.patientName || 'Patient'}, ${this.visitDetails.demographics || ''}, presents for scheduled ${this.visitDetails.visitType?.toLowerCase() || 'consultation'}.\nChief reason for visit: ${this.visitDetails.reason || 'Clinical review'}.\nConsultation audio recording and live transcription in progress.`,
      objective: `Recorded Vitals: ${this.visitDetails.vitals ? (typeof this.visitDetails.vitals === 'object' ? 'BP ' + (this.visitDetails.vitals.bp || '120/80 mmHg') + ', HR ' + (this.visitDetails.vitals.hr || '72 bpm') : this.visitDetails.vitals) : 'BP 120/80 mmHg, HR 72 bpm, SpO2 98%'}.\nClinical examination and physical findings pending doctor entry.`,
      assessment: `Clinical presentation for "${this.visitDetails.reason || 'scheduled visit'}" under active evaluation.`,
      plan: `1. Conduct clinical consultation and interview.\n2. Record session audio for AI-assisted documentation.\n3. Formulate evidence-based treatment directives and follow-up.`
    };
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

    this.activeFollowUpNotice = `"${questionItem.question}" — Ambient microphone channel is live. Ask patient now.`;
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
   * Resets answered status of protocol inquiries without mutating the live consultation transcript.
   */
  resetInquiries(): void {
    this.isFollowUpCompleted = false;
    this.activeInquiryQuestion = null;
    this.answeredQuestionIds.clear();
    this.guidelineFollowUpQuestionsList.forEach(q => {
      q.asked = false;
      q.answered = false;
    });
    this.activeFollowUpNotice = 'Protocol inquiries reset.';
    setTimeout(() => {
      this.activeFollowUpNotice = null;
    }, 3000);
  }

  /**
   * Alias for backward compatibility.
   */
  resetConsultationRound(): void {
    this.resetInquiries();
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
      patientName: p?.patientName || 'Marcus Delgado',
      patientId: patId,
      demographics: p?.demographics || '42M · #00847261',
      age: p?.age || 42,
      gender: p?.gender || 'Male',
      doctorName: docName,
      doctorId: docId,
      doctorSpecialty: `${dept} / Specialist`,
      encounterId: `ENC-${patId.replace('#', '')}-${Date.now().toString().slice(-4)}`,
      consultationDate: p?.date || new Date().toISOString().split('T')[0],
      reason: p?.reason || 'Clinical Consultation',
      condition: p?.condition || 'Under Evaluation',
      vitals: p?.vitals || { bp: '138/88 mmHg', hr: '72 bpm', temp: '36.6 °C', weight: '81 kg', spo2: '98%' },
      soap: this.effectiveSoapReport,
      prescription: this.currentPrescription
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
    const patientName = this.visitDetails?.patientName || 'Patient';
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
        encounterId,
        this.currentPrescription,
        patientName
      );

      this.isSharingSoap = false;
      this.isSoapShared = true;
      this.soapShareMessage = `Official SOAP Report & Prescribed Medication (${this.currentPrescription.medication} ${this.currentPrescription.strength}) successfully shared with ${this.visitDetails.patientName || 'patient'}. The patient's portal (Follow-up Alerts, Medical Records, Prescriptions) is now updated.`;

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

  // ----------------------------------------------------
  // PRESCRIPTION DIRECTIVE METHODS (Doctor Clinical Wisdom)
  // ----------------------------------------------------
  openPrescriptionModal(): void {
    this.editPrescriptionForm = { ...this.currentPrescription };
    this.prescriptionChangeStatus = 'No changes made';
    this.showPrescriptionModal = true;
  }

  closePrescriptionModal(): void {
    this.showPrescriptionModal = false;
  }

  onPrescriptionFieldChange(): void {
    const isDifferent =
      this.editPrescriptionForm.medication !== this.currentPrescription.medication ||
      this.editPrescriptionForm.strength !== this.currentPrescription.strength ||
      this.editPrescriptionForm.route !== this.currentPrescription.route ||
      this.editPrescriptionForm.frequency !== this.currentPrescription.frequency ||
      this.editPrescriptionForm.duration !== this.currentPrescription.duration ||
      this.editPrescriptionForm.quantity !== this.currentPrescription.quantity ||
      this.editPrescriptionForm.refills !== this.currentPrescription.refills ||
      this.editPrescriptionForm.instructions !== this.currentPrescription.instructions;

    this.prescriptionChangeStatus = isDifferent ? 'Unsaved changes' : 'No changes made';
  }

  discardPrescriptionEdits(): void {
    this.editPrescriptionForm = { ...this.currentPrescription };
    this.prescriptionChangeStatus = 'No changes made';
    this.showPrescriptionModal = false;
  }

  savePrescriptionEdits(): void {
    this.currentPrescription = { ...this.editPrescriptionForm };
    this.prescriptionChangeStatus = 'No changes made';
    this.showPrescriptionModal = false;

    this.saveStatusMessage = `Prescription for ${this.currentPrescription.medication} (${this.currentPrescription.strength}) updated and recorded in SOAP report.`;
    setTimeout(() => {
      if (this.saveStatusMessage?.startsWith('Prescription for')) {
        this.saveStatusMessage = null;
      }
    }, 4500);
  }

  getPrescriptionForPatient(patientId: string, patientName?: string): PrescriptionItem {
    if (patientName?.includes('Delgado') || patientId.includes('00847261')) {
      return {
        medication: 'Lisinopril',
        strength: '10 mg',
        route: 'Oral',
        frequency: 'Once daily',
        duration: '6 weeks',
        quantity: '42 tablets',
        refills: '1',
        instructions: 'Take one tablet every morning with breakfast. Continue daily home blood pressure monitoring.',
        prescribedBy: 'Dr. Yuki Tanaka',
        prescribedDate: 'Aug 13, 2026'
      };
    }
    if (patientName?.includes('Sharma') || patientId.includes('00391847')) {
      return {
        medication: 'Propranolol',
        strength: '40 mg',
        route: 'Oral',
        frequency: 'Twice daily',
        duration: '4 weeks',
        quantity: '56 tablets',
        refills: '1',
        instructions: 'Take one tablet twice daily with food. Monitor resting pulse; do not discontinue abruptly.',
        prescribedBy: 'Dr. Yuki Tanaka',
        prescribedDate: 'Aug 13, 2026'
      };
    }
    if (patientName?.includes('Kowalski') || patientId.includes('00673920')) {
      return {
        medication: 'Albuterol Inhaler',
        strength: '90 mcg',
        route: 'Inhalation',
        frequency: 'Every 4-6h PRN',
        duration: '30 days',
        quantity: '1 canister (200 doses)',
        refills: '2',
        instructions: 'Inhale 1-2 puffs every 4 to 6 hours as needed for shortness of breath or wheezing. Rinse mouth after use.',
        prescribedBy: 'Dr. Yuki Tanaka',
        prescribedDate: 'Aug 13, 2026'
      };
    }
    return {
      medication: 'Amoxicillin',
      strength: '500 mg',
      route: 'Oral',
      frequency: 'Three times daily',
      duration: '7 days',
      quantity: '21 capsules',
      refills: '0',
      instructions: 'Take one capsule three times daily with a full glass of water after meals until completed.',
      prescribedBy: 'Dr. Yuki Tanaka',
      prescribedDate: 'Aug 13, 2026'
    };
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
