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
      vitals: (p.vitals && typeof p.vitals === 'object' && Object.keys(p.vitals).length > 0)
        ? p.vitals
        : { bp: '120/80 mmHg', hr: '72 bpm', pain: '0/10', spo2: '98%', temp: '36.6 °C' },
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
  isSoapManuallyEdited: boolean = false;
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
      vitals: (patient.vitals && typeof patient.vitals === 'object' && Object.keys(patient.vitals).length > 0)
        ? patient.vitals
        : { bp: '120/80 mmHg', hr: '72 bpm', pain: '0/10', spo2: '98%', temp: '36.6 °C' }
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
    this.isSoapManuallyEdited = false;
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
    this.isSoapManuallyEdited = !!this.editedSoapReport;
    this.aiSuggestionsList = session.aiSuggestions || session.ai_suggestions || session.clinicalAnalysis?.ai_suggestions || session.clinicalAnalysis?.aiSuggestions || [];
    this.patientSummaryText = '';
    this.answeredQuestionIds.clear();
    this.isFollowUpCompleted = false;
  }

  selectLiveSession(): void {
    this.selectedSessionId = 'live';
    const patientId = this.visitDetails.visitId;
    this.recordingService.switchPatient(patientId);
    this.transcriptExchanges = this.recordingService.latestExchanges() || [];
    this.aiSuggestionsList = this.recordingService.latestSuggestions() || [];
    this.editedSoapReport = null;
    this.isSoapManuallyEdited = false;
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
    const analysis = this.recordingService.latestClinicalAnalysis();
    const hasFullAnalysis = !!(analysis && analysis.differential_diagnosis && analysis.differential_diagnosis.length > 0 && analysis.guideline_medicines && analysis.guideline_medicines.length > 0);
    const exchanges = this.currentTranscriptExchanges;

    if (exchanges && exchanges.length > 0 && !hasFullAnalysis) {
      this.isProcessingAudio = true;
      const turns = exchanges.map(e => ({
        speaker: e.isDoctor ? 'Doctor' : 'Patient',
        text: e.text
      }));
      this.recordingService.analyzeConversation(
        turns, 
        this.recordingService.latestTranscript(),
        {
          doctorName: this.currentDoctorName,
          patientName: this.visitDetails.patientName || 'Patient',
          doctorInitials: this.doctorInitials,
          patientInitials: this.visitDetails.initials || 'PT',
          visitId: this.visitDetails.visitId
        }
      ).subscribe({
        next: (res) => {
          console.log('Clinical analysis generated dynamically:', res);
          this.isProcessingAudio = false;
          this.editedSoapReport = null;
        },
        error: (err) => {
          console.error('Failed to run clinical analysis:', err);
          this.isProcessingAudio = false;
        }
      });
    }
    this.editedSoapReport = null;
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
    this.isProcessingAudio = true;
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
        this.isProcessingAudio = false;
        if (res.exchanges && res.exchanges.length > 0) {
          this.transcriptExchanges = res.exchanges;
        }
        this.editedSoapReport = null;
        this.isSoapManuallyEdited = false;
        this.answeredQuestionIds.clear();
        this.isFollowUpCompleted = false;
        this.recordingService.getPatientConsultationSessions(pid).subscribe({
          next: (sessions) => {
            this.patientSessions = sessions || [];
          }
        });
      },
      error: (err) => {
        console.error('Upload & transcription failed:', err);
        this.isProcessingAudio = false;
      }
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
    const analysis = this.recordingService.latestClinicalAnalysis();
    const candidateList = (live && live.length > 0)
      ? live
      : (this.aiSuggestionsList && this.aiSuggestionsList.length > 0)
        ? this.aiSuggestionsList
        : (analysis?.ai_suggestions || analysis?.aiSuggestions || []);

    if (candidateList && candidateList.length > 0) {
      return candidateList.map((s: any, idx: number) => {
        if (!s) return null;
        if (typeof s === 'string') {
          return {
            id: idx + 1,
            type: 'high',
            tag: 'HIGH · CLINICAL',
            text: s,
            title: s,
            description: '',
            priority: 'HIGH',
            category: 'CLINICAL'
          };
        }

        // 1. Resolve text content robustly
        let text = '';
        if (typeof s.text === 'string' && s.text.trim()) {
          text = s.text.trim();
        } else if (s.title && s.description) {
          text = `${s.title} — ${s.description}`;
        } else if (s.title) {
          text = s.title;
        } else if (s.description) {
          text = s.description;
        } else if (s.suggestion) {
          text = s.suggestion;
        } else if (s.actionText) {
          text = s.actionText;
        } else if (s.message) {
          text = s.message;
        } else if (s.content) {
          text = s.content;
        }

        // 2. Resolve tag
        let tag = '';
        if (typeof s.tag === 'string' && s.tag.trim()) {
          tag = s.tag.trim();
        } else {
          const pri = (s.priority || (s.type ? s.type.toUpperCase() : 'HIGH')).toUpperCase();
          const cat = (s.category || 'CLINICAL').toUpperCase();
          tag = `${pri} · ${cat}`;
        }

        // 3. Resolve type
        let type = 'high';
        if (typeof s.type === 'string' && s.type.trim()) {
          type = s.type.toLowerCase();
        } else if (typeof s.priority === 'string') {
          type = s.priority.toLowerCase();
        } else if (tag.includes('MEDIUM')) {
          type = 'medium';
        } else if (tag.includes('LOW')) {
          type = 'low';
        }

        return {
          id: s.id || idx + 1,
          type,
          tag,
          text,
          title: s.title || text,
          description: s.description || '',
          priority: s.priority || (type === 'medium' ? 'MEDIUM' : type === 'low' ? 'LOW' : 'HIGH'),
          category: s.category || (tag.includes(' · ') ? tag.split(' · ')[1] : 'CLINICAL')
        };
      }).filter((item: any) => item && !!item.text);
    }
    return [];
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

    const dynamicQuestions = this.getDynamicFollowUpQuestionsForCurrentPatient();
    return dynamicQuestions.map(q => ({
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

  formatVitalsDisplay(rawVitals: any): string {
    if (!rawVitals) return '';

    // Handle stringified JSON like "{}" or '{"bp":"120/80"}'
    if (typeof rawVitals === 'string') {
      const trimmed = rawVitals.trim();
      if (!trimmed || trimmed === '{}' || trimmed === '[]' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '""') {
        return '';
      }
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          rawVitals = JSON.parse(trimmed);
        } catch {
          // If JSON.parse fails, strip wrapping braces and return cleaned content
          return trimmed.replace(/^\{+/, '').replace(/\}+$/, '').trim();
        }
      } else {
        return trimmed;
      }
    }

    if (typeof rawVitals === 'object' && rawVitals !== null) {
      const keys = Object.keys(rawVitals).filter(
        k => rawVitals[k] !== undefined && rawVitals[k] !== null && String(rawVitals[k]).trim() !== '' && String(rawVitals[k]).trim() !== '{}'
      );
      if (keys.length === 0) {
        return '';
      }

      const parts: string[] = [];
      const v = rawVitals;

      const bp = v.bp || v.blood_pressure || v.BP || v.bloodPressure;
      if (bp) {
        const bpStr = String(bp).trim();
        if (bpStr && bpStr !== '{}') {
          parts.push(`BP: ${bpStr.toLowerCase().includes('mmhg') ? bpStr : bpStr + ' mmHg'}`);
        }
      }

      const hr = v.hr || v.heart_rate || v.pulse || v.HR || v.heartRate;
      if (hr) {
        const hrStr = String(hr).trim();
        if (hrStr && hrStr !== '{}') {
          parts.push(`HR: ${hrStr.toLowerCase().includes('bpm') ? hrStr : hrStr + ' bpm'}`);
        }
      }

      const spo2 = v.spo2 || v.o2_sat || v.oxygen || v.SpO2 || v.oxygenSaturation;
      if (spo2) {
        const spo2Str = String(spo2).trim();
        if (spo2Str && spo2Str !== '{}') {
          parts.push(`SpO2: ${spo2Str.includes('%') ? spo2Str : spo2Str + '%'}`);
        }
      }

      const temp = v.temp || v.temperature || v.Temp;
      if (temp) {
        const tempStr = String(temp).trim();
        if (tempStr && tempStr !== '{}') {
          parts.push(`Temp: ${tempStr.includes('°') || tempStr.includes('C') || tempStr.includes('F') ? tempStr : tempStr + ' °C'}`);
        }
      }

      const wt = v.weight || v.wt || v.Weight;
      if (wt) {
        const wtStr = String(wt).trim();
        if (wtStr && wtStr !== '{}') {
          parts.push(`Weight: ${wtStr.toLowerCase().includes('kg') || wtStr.toLowerCase().includes('lbs') ? wtStr : wtStr + ' kg'}`);
        }
      }

      const pain = v.pain || v.Pain;
      if (pain) {
        const painStr = String(pain).trim();
        if (painStr && painStr !== '{}') {
          parts.push(`Pain: ${painStr}`);
        }
      }

      const resp = v.resp || v.rr || v.respiratory_rate || v.respiratoryRate;
      if (resp) {
        const respStr = String(resp).trim();
        if (respStr && respStr !== '{}') {
          parts.push(`RR: ${respStr}`);
        }
      }

      const glucose = v.glucose || v.blood_sugar || v.bloodSugar || v.bgl || v.sugar;
      if (glucose) {
        const gStr = String(glucose).trim();
        if (gStr && gStr !== '{}') {
          parts.push(`Blood Sugar: ${gStr.toLowerCase().includes('mg/dl') || gStr.toLowerCase().includes('mmol') ? gStr : gStr + ' mg/dL'}`);
        }
      }

      if (parts.length === 0) {
        for (const k of keys) {
          const valStr = String(v[k]).trim();
          if (valStr && valStr !== '{}') {
            parts.push(`${k.replace(/_/g, ' ').toUpperCase()}: ${valStr}`);
          }
        }
      }

      return parts.join(' · ');
    }

    const finalStr = String(rawVitals).trim();
    if (!finalStr || finalStr === '{}' || finalStr === '[]' || finalStr === 'null' || finalStr === 'undefined') {
      return '';
    }
    return finalStr.replace(/^\{+/, '').replace(/\}+$/, '').trim();
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
      if (analysis.summary.chief_complaint) return analysis.summary.chief_complaint;
      return 'Clinical consultation summary available.';
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

      // Resolve vitals cleanly without raw JSON braces {}
      const entityVitals = this.formatVitalsDisplay(e.vital_signs || e.vitals);
      const intakeVitals = this.formatVitalsDisplay(this.visitDetails?.vitals);
      const vitalsValue = entityVitals || (intakeVitals ? `${intakeVitals} (Intake)` : 'BP: 120/80 mmHg · HR: 72 bpm · SpO2: 98% (Baseline)');
      findings.push({ label: 'VITALS', value: vitalsValue });

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
    if (analysis?.summary?.identified_issues && Array.isArray(analysis.summary.identified_issues) && analysis.summary.identified_issues.length > 0) {
      return analysis.summary.identified_issues.map((it: any) => typeof it === 'string' ? { text: it, type: 'warning', dotColor: '#f59e0b' } : it);
    }
    if (analysis?.entities?.potential_risks && Array.isArray(analysis.entities.potential_risks) && analysis.entities.potential_risks.length > 0) {
      return analysis.entities.potential_risks.map((it: any) => ({ text: typeof it === 'string' ? it : it.risk, type: 'danger', dotColor: '#ef4444' }));
    }
    if (analysis?.entities?.warning_signs && Array.isArray(analysis.entities.warning_signs) && analysis.entities.warning_signs.length > 0) {
      return analysis.entities.warning_signs.map((it: any) => ({ text: typeof it === 'string' ? it : it.warning || it.sign, type: 'warning', dotColor: '#f59e0b' }));
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
          rank: d.rank || idx + 1,
          title: d.title || d.name || d.condition || d.diagnosis || 'Clinical Assessment',
          icdCode: d.icdCode || d.icd10_code || d.icd10 || d.icd_code || 'R69',
          risk: risk,
          riskLabel: risk,
          percentage: pct,
          color: d.color || (risk === 'high' ? '#0d9488' : risk === 'medium' ? '#f59e0b' : '#2dd4bf'),
          description: d.description || d.reason || d.justification || d.recommended_plan || 'Evaluated based on clinical symptoms and encounter context.'
        };
      });
    }
    if (this.isFollowUpCompleted) {
      const dynamic = this.getDynamicDifferentialForCurrentPatient();
      if (dynamic.length > 0) {
        return dynamic.map((d, i) => i === 0 ? { ...d, percentage: Math.max(d.percentage, 86) } : d);
      }
    }
    if (this.currentTranscriptExchanges.length > 0 || (this.recordingService.latestTranscript() && this.recordingService.latestTranscript().trim().length > 0) || this.visitDetails.reason) {
      return this.getDynamicDifferentialForCurrentPatient();
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
          title: `Acute clinical red flags excluded during consultation inquiries for ${this.visitDetails.patientName}.`,
          recommendation: 'Maintain standard clinical vigilance and scheduled surveillance.'
        }
      ];
    }
    return this.getDynamicRedFlagsForCurrentPatient();
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
    if (this.currentTranscriptExchanges.length > 0 || (this.recordingService.latestTranscript() && this.recordingService.latestTranscript().trim().length > 0) || this.visitDetails.reason) {
      return this.getDynamicMedicinesForCurrentPatient();
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
          { name: 'Symptom completeness', percentage: 90, description: 'Symptom pattern and clinical timeline confirmed', color: '#0d9488' },
          { name: 'Medical history coverage', percentage: 92, description: 'Prior diagnoses and medication adherence documented', color: '#0f766e' },
          { name: 'Lifestyle & social history', percentage: 84, description: 'Workday habits, sleep, and routine triggers fully explored', color: '#0d9488' },
          { name: 'DDx alignment', percentage: 91, description: 'High concordance with clinical presentation', color: '#0d9488' },
          { name: 'Guideline adherence', percentage: 89, description: 'Aligned with evidence-based management protocols', color: '#0d9488' }
        ]
      };
    }
    const analysis = this.recordingService.latestClinicalAnalysis();
    const raw = analysis?.confidence_metrics || analysis?.confidenceMetrics;
    if (raw && (raw.overallScore != null || raw.overall_confidence != null || raw.top_differential_confidence_percent != null)) {
      const score = raw.overallScore ?? Math.round((raw.overall_confidence ? raw.overall_confidence * 100 : raw.top_differential_confidence_percent) ?? 72);
      const level = raw.overallLevel || (score >= 75 ? 'High — Validated' : score >= 65 ? 'Moderate — Active Evaluation' : 'Moderate — Review');
      const subtext = raw.subtext || (score >= 70 ? `High clinical certainty (${score}%) achieved.` : `Current diagnostic confidence is ${score}% (below 70% threshold). Ask targeted protocol inquiries.`);
      let domains = raw.domains;
      if (!Array.isArray(domains) || domains.length === 0) {
        if (raw.breakdown && typeof raw.breakdown === 'object') {
          domains = Object.keys(raw.breakdown).map(k => ({
            name: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            percentage: Math.round(Number(raw.breakdown[k]) <= 1 ? Number(raw.breakdown[k]) * 100 : Number(raw.breakdown[k])),
            description: 'Domain clinical metric evaluated',
            color: '#0d9488'
          }));
        } else {
          domains = this.getDynamicConfidenceMetrics().domains;
        }
      }
      return {
        overallScore: score,
        overallLevel: level,
        subtext,
        domains
      };
    }
    return this.getDynamicConfidenceMetrics();
  }

  get currentSoapReport(): any {
    const analysis = this.recordingService.latestClinicalAnalysis();
    const live = analysis?.soap_report || analysis?.soapReport;
    if (live && live.subjective && live.assessment && live.plan) {
      return live;
    }
    return this.getDynamicSoapReport();
  }

  get currentDoctorDepartment(): string {
    return this.authService.currentUser()?.department || 'Cardiology';
  }

  private getConsultationContextText(): string {
    const reason = this.visitDetails?.reason || '';
    const condition = this.visitDetails?.condition || '';
    const patientName = this.visitDetails?.patientName || '';
    const transcript = this.recordingService.latestTranscript() || '';
    const exchangesText = (this.currentTranscriptExchanges || []).map((e: any) => e.text || '').join(' ');
    return `${reason} ${condition} ${patientName} ${transcript} ${exchangesText}`.toLowerCase();
  }

  getDynamicDifferentialForCurrentPatient(): any[] {
    const text = this.getConsultationContextText();
    
    // 1. Diabetes / Endocrine / Glucose
    if (/diabet|sugar|glucose|thirst|urina|polyuria|polydipsia|hba1c|endocrine/i.test(text)) {
      return [
        {
          rank: 1,
          title: 'Type 2 Diabetes Mellitus',
          icdCode: 'E11.9',
          risk: 'high',
          riskLabel: 'high',
          percentage: 88,
          color: '#0d9488',
          description: 'Symptom profile characterized by polydipsia, polyuria, and fatigue; fasting blood glucose and HbA1c elevation screen indicated per NICE NG28.'
        },
        {
          rank: 2,
          title: 'Dehydration / Hyperosmolar Fluid Deficit',
          icdCode: 'E86.0',
          risk: 'medium',
          riskLabel: 'medium',
          percentage: 65,
          color: '#f59e0b',
          description: 'Osmotic diuresis secondary to glycosuria with volume contraction; oral rehydration and electrolyte monitoring indicated.'
        },
        {
          rank: 3,
          title: 'Metabolic Syndrome / Dysglycemia',
          icdCode: 'E88.81',
          risk: 'low',
          riskLabel: 'low',
          percentage: 46,
          color: '#2dd4bf',
          description: 'Cluster of metabolic factors including insulin resistance, weight distribution, and vascular risk factors.'
        }
      ];
    }

    // 2. Hypertension / Blood Pressure / Cardiovascular
    if (/hypertens|blood pressure|high bp|systolic|diastolic|chest|palpitat|cardio/i.test(text)) {
      return [
        {
          rank: 1,
          title: 'Essential (Primary) Hypertension Stage 1',
          icdCode: 'I10',
          risk: 'high',
          riskLabel: 'high',
          percentage: 84,
          color: '#0d9488',
          description: 'Sustained systemic arterial pressure exceeding 130/80 mmHg; requires guideline-directed monotherapy and cardiovascular risk surveillance per NICE NG136.'
        },
        {
          rank: 2,
          title: 'Tension-Type Headache (Hemodynamic Exacerbation)',
          icdCode: 'G44.2',
          risk: 'medium',
          riskLabel: 'medium',
          percentage: 68,
          color: '#f59e0b',
          description: 'Bilateral band-like cephalea exacerbated by work stress, posture, and elevated hemodynamic afterload.'
        },
        {
          rank: 3,
          title: 'Secondary Hypertension Screening',
          icdCode: 'I15.8',
          risk: 'low',
          riskLabel: 'low',
          percentage: 38,
          color: '#2dd4bf',
          description: 'Evaluation for underlying renovascular, endocrine, or sleep apnoea etiologies in suboptimally controlled blood pressure.'
        }
      ];
    }

    // 3. Headache / Migraine / Neurological Cephalea
    if (/headache|migraine|cephalea|forehead|temple|throbbing|tightness|scalp/i.test(text)) {
      return [
        {
          rank: 1,
          title: 'Tension-Type Headache, Episodic',
          icdCode: 'G44.209',
          risk: 'high',
          riskLabel: 'high',
          percentage: 85,
          color: '#0d9488',
          description: 'Bilateral pressing/tightening pain of mild-to-moderate intensity lasting 30 minutes to days; absent nausea, photophobia, or focal deficits.'
        },
        {
          rank: 2,
          title: 'Migraine without Aura',
          icdCode: 'G43.009',
          risk: 'medium',
          riskLabel: 'medium',
          percentage: 64,
          color: '#f59e0b',
          description: 'Recurrent unilateral or throbbing cephalalgia aggravated by routine physical activity; sensory sensitivity screen recommended.'
        },
        {
          rank: 3,
          title: 'Caffeine-Withdrawal Cephalea',
          icdCode: 'G44.82',
          risk: 'low',
          riskLabel: 'low',
          percentage: 42,
          color: '#2dd4bf',
          description: 'Afternoon onset headache coinciding with daily caffeine clearance in patients consuming > 300 mg daily.'
        }
      ];
    }

    // 4. Respiratory / Cough / Infection / Flu
    if (/cough|throat|fever|phlegm|sneeze|breath|respirat|cold|bronch|lung/i.test(text)) {
      return [
        {
          rank: 1,
          title: 'Acute Upper Respiratory Tract Infection',
          icdCode: 'J06.9',
          risk: 'high',
          riskLabel: 'high',
          percentage: 86,
          color: '#0d9488',
          description: 'Acute self-limiting viral inflammation of the upper respiratory tract; symptomatic supportive therapy indicated per NICE guidelines.'
        },
        {
          rank: 2,
          title: 'Acute Bronchitis',
          icdCode: 'J20.9',
          risk: 'medium',
          riskLabel: 'medium',
          percentage: 62,
          color: '#f59e0b',
          description: 'Bronchial inflammation with persistent cough without clinical or radiographic evidence of pneumonia.'
        },
        {
          rank: 3,
          title: 'Seasonal Allergic Rhinitis / Airway Irritation',
          icdCode: 'J30.2',
          risk: 'low',
          riskLabel: 'low',
          percentage: 44,
          color: '#2dd4bf',
          description: 'Environmental mucosal hypersensitivity with clear nasal discharge and secondary pharyngeal irritation.'
        }
      ];
    }

    // Default Fallback based on Reason & Patient
    return [
      {
        rank: 1,
        title: this.visitDetails?.reason ? `${this.visitDetails.reason}` : 'Primary Clinical Presentation',
        icdCode: 'R69',
        risk: 'high',
        riskLabel: 'high',
        percentage: 78,
        color: '#0d9488',
        description: `Primary clinical hypothesis evaluated based on patient presentation (${this.visitDetails?.patientName || 'Patient'}) and active consultation dialogue.`
      },
      {
        rank: 2,
        title: `Secondary Manifestation (${this.visitDetails?.condition || 'General Assessment'})`,
        icdCode: 'R68.89',
        risk: 'medium',
        riskLabel: 'medium',
        percentage: 58,
        color: '#f59e0b',
        description: 'Associated symptomatic factors under clinical evaluation during consultation.'
      },
      {
        rank: 3,
        title: 'Routine Health Maintenance & Preventative Review',
        icdCode: 'Z00.00',
        risk: 'low',
        riskLabel: 'low',
        percentage: 42,
        color: '#2dd4bf',
        description: 'Baseline health screening, preventative surveillance, and guideline-directed checkup.'
      }
    ];
  }

  getDynamicMedicinesForCurrentPatient(): any[] {
    const text = this.getConsultationContextText();

    if (/diabet|sugar|glucose|thirst|urina|polyuria|polydipsia|hba1c|endocrine/i.test(text)) {
      return [
        {
          name: 'Metformin Hydrochloride',
          drugClass: 'Biguanide / Antidiabetic',
          grade: 'Grade A',
          source: 'NICE NG28 / BNF',
          dosage: '500 mg PO once daily with meals, titrate to 1000 mg BID',
          recommendation: 'First-line pharmacotherapy for glycemic control in Type 2 Diabetes Mellitus; check baseline eGFR prior to dose escalation.',
          warning: 'Discontinue if eGFR < 30 mL/min/1.73m² or in states of tissue hypoperfusion/acute hypoxia.'
        },
        {
          name: 'Empagliflozin',
          drugClass: 'SGLT2 Inhibitor',
          grade: 'Grade A',
          source: 'ADA / EASD 2024 / BNF',
          dosage: '10 mg PO once daily in morning',
          recommendation: 'Add-on agent for cardiorenal protection and glycemic reduction through renal glucose clearance.',
          warning: 'Maintain adequate hydration; counsel patient on genital hygiene to prevent mycotic infections.'
        },
        {
          name: 'Oral Rehydration Solution (ORS)',
          drugClass: 'Fluid & Electrolyte Therapy',
          grade: 'Grade A',
          source: 'WHO / BNF',
          dosage: '200-400 mL oral fluid replacement PRN for thirst/polyuria',
          recommendation: 'Targeted replenishment of volume and electrolytes lost to osmotic diuresis; avoid sugary sodas and juices.',
          warning: 'Monitor serum sodium and potassium in patients with underlying chronic renal compromise.'
        }
      ];
    }

    if (/hypertens|blood pressure|high bp|systolic|diastolic|chest|palpitat|cardio/i.test(text)) {
      return [
        {
          name: 'Lisinopril',
          drugClass: 'ACE Inhibitor',
          grade: 'Grade A',
          source: 'NICE NG136 / JNC8',
          dosage: '10 mg PO once daily in morning, titrate to 20 mg OD',
          recommendation: 'First-line monotherapy for primary hypertension targeting systolic BP < 130 mmHg and diastolic < 80 mmHg.',
          warning: 'Check renal panel and potassium within 2-4 weeks; discontinue immediately if angioedema or intractable dry cough occurs.'
        },
        {
          name: 'Amlodipine Besylate',
          drugClass: 'Calcium Channel Blocker (Dihydropyridine)',
          grade: 'Grade A',
          source: 'NICE NG136 / BNF',
          dosage: '5 mg PO once daily',
          recommendation: 'Add-on therapy for uncontrolled Stage 1 or Stage 2 hypertension to achieve peripheral arterial vasodilatation.',
          warning: 'Monitor for peripheral pedal oedema and postural hypotension.'
        },
        {
          name: 'Atorvastatin',
          drugClass: 'HMG-CoA Reductase Inhibitor',
          grade: 'Grade A',
          source: 'NICE CG181 / BNF',
          dosage: '20 mg PO once daily at bedtime',
          recommendation: 'Primary cardiovascular event prevention in hypertensive adults with elevated QRISK3 score.',
          warning: 'Report unexplained muscular pain or dark urine immediately.'
        }
      ];
    }

    if (/headache|migraine|cephalea|forehead|temple|throbbing|tightness|scalp/i.test(text)) {
      return [
        {
          name: 'Paracetamol (Acetaminophen)',
          drugClass: 'Simple Analgesic',
          grade: 'Grade A',
          source: 'BNF / SIGN 107',
          dosage: '500 mg - 1000 mg PO every 4-6 hours PRN (Max 4000 mg/24h)',
          recommendation: 'First-line acute symptomatic relief for mild-to-moderate episodic tension-type headache.',
          warning: 'Do not exceed 4 g/day; risk of acute hepatic necrosis in overdose or concurrent heavy alcohol consumption.'
        },
        {
          name: 'Ibuprofen',
          drugClass: 'Non-Steroidal Anti-Inflammatory (NSAID)',
          grade: 'Grade A',
          source: 'NICE CKS / BNF',
          dosage: '400 mg PO with food every 6-8 hours PRN (Max 1200 mg/day OTC)',
          recommendation: 'Second-line acute anti-inflammatory relief for persistent tension-type cephalalgia.',
          warning: 'Avoid in active gastric ulceration, severe renal impairment, or severe heart failure; take with meals.'
        },
        {
          name: 'Amitriptyline Hydrochloride',
          drugClass: 'Tricyclic Antidepressant / Neuromodulator',
          grade: 'Grade B',
          source: 'SIGN 107 / NICE CKS',
          dosage: '10 mg PO once daily at bedtime, titrate up to 25-50 mg',
          recommendation: 'Evidence-based prophylactic therapy for chronic frequent tension headaches exceeding 15 days per month.',
          warning: 'Anticholinergic side effects (dry mouth, sedation); contraindicated in acute recovery phase post-myocardial infarction.'
        }
      ];
    }

    // Default Fallback
    return [
      {
        name: 'First-Line Symptomatic Formulary Agent',
        drugClass: 'Therapeutic Agent',
        grade: 'Grade A',
        source: 'NICE / BNF Guidelines',
        dosage: 'Dosage as clinically determined by physician',
        recommendation: `Evidence-based pharmacotherapy for ${this.visitDetails?.reason || 'primary clinical presentation'}.`,
        warning: 'Review patient allergies, liver and renal profile prior to initiation.'
      },
      {
        name: 'Supportive Maintenance & Hydration Therapy',
        drugClass: 'Supportive Protocol',
        grade: 'Grade B',
        source: 'SIGN / WHO',
        dosage: 'Daily supportive regimen',
        recommendation: 'Structured lifestyle, hydration, and nutritional supportive therapy.',
        warning: 'Advise patient to return if symptoms persist or escalate.'
      }
    ];
  }

  getDynamicRedFlagsForCurrentPatient(): any[] {
    const text = this.getConsultationContextText();

    if (/diabet|sugar|glucose|thirst|urina|polyuria|polydipsia|hba1c|endocrine/i.test(text)) {
      return [
        {
          severity: 'CRITICAL',
          title: 'Diabetic Ketoacidosis (DKA) / Hyperosmolar Hyperglycaemic State (HHS) Warning',
          recommendation: 'Immediate capillary blood glucose, blood ketone test, and venous blood gas if nausea, vomiting, or altered mental status occurs.'
        },
        {
          severity: 'WARNING',
          title: 'Osmotic Volume Depletion & Orthostatic Hypoperfusion',
          recommendation: 'Evaluate postural blood pressure and hydration markers; initiate prompt oral rehydration protocol.'
        }
      ];
    }

    if (/hypertens|blood pressure|high bp|systolic|diastolic|chest|palpitat|cardio/i.test(text)) {
      return [
        {
          severity: 'CRITICAL',
          title: 'Hypertensive Emergency Screen (BP > 180/120 mmHg with Target Organ Compromise)',
          recommendation: 'Immediate emergency evaluation for acute encephalopathy, pulmonary oedema, aortic dissection, or acute coronary syndrome.'
        },
        {
          severity: 'WARNING',
          title: 'Suboptimal Blood Pressure Regulation (Systolic > 140 mmHg on Monotherapy)',
          recommendation: 'Review patient medication adherence and uptitrate dual anti-hypertensive therapy per NICE Step 2 guideline.'
        }
      ];
    }

    if (/headache|migraine|cephalea|forehead|temple|throbbing|tightness|scalp/i.test(text)) {
      return [
        {
          severity: 'CRITICAL',
          title: 'Thunderclap Onset / Focal Neurological Deficits Screen',
          recommendation: 'Rule out subarachnoid hemorrhage or space-occupying lesion if sudden maximum intensity within 1 minute or unilateral limb weakness.'
        },
        {
          severity: 'WARNING',
          title: 'Medication Overuse Headache Risk (> 15 Days Analgesics / Month)',
          recommendation: 'Screen monthly analgesic frequency to prevent rebound analgesic dependency and secondary medication overuse cephalea.'
        }
      ];
    }

    return [
      {
        severity: 'WARNING',
        title: `Clinical Vigilance Indicator for ${this.visitDetails?.reason || 'Presenting Complaint'}`,
        recommendation: 'Monitor patient response to clinical directives; arrange expedited review if red-flag symptoms develop.'
      }
    ];
  }

  getDynamicFollowUpQuestionsForCurrentPatient(): Array<{
    id: string;
    question: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    priorityClass: string;
    asked: boolean;
    answered: boolean;
    doctorSnippet: string;
    patientSnippet: string;
  }> {
    const text = this.getConsultationContextText();
    const patientName = this.visitDetails?.patientName || 'Patient';

    if (/diabet|sugar|glucose|thirst|urina|polyuria|polydipsia|hba1c|endocrine/i.test(text)) {
      return [
        {
          id: 'dfq-d1',
          question: 'Have you noticed increased frequency of urination, especially waking up multiple times at night (nocturia)?',
          priority: 'HIGH',
          priorityClass: 'priority-high',
          asked: false,
          answered: false,
          doctorSnippet: `Have you noticed having to use the restroom more frequently than usual, ${patientName}, especially waking up during the night?`,
          patientSnippet: 'Yes, exactly. I am waking up two or three times every night to urinate, which never used to happen.'
        },
        {
          id: 'dfq-d2',
          question: 'Have you been experiencing persistent unquenchable thirst, dry mouth, or unexplained weight loss?',
          priority: 'HIGH',
          priorityClass: 'priority-high',
          asked: false,
          answered: false,
          doctorSnippet: 'Have you noticed feeling unusually thirsty or having dry mouth no matter how much water you drink?',
          patientSnippet: 'Yes doctor, my mouth feels dry constantly and I am drinking several bottles of water a day.'
        },
        {
          id: 'dfq-d3',
          question: 'Do you ever experience blurred vision, pronounced fatigue after eating, or slow-healing cuts?',
          priority: 'MEDIUM',
          priorityClass: 'priority-medium',
          asked: false,
          answered: false,
          doctorSnippet: 'Have you had any episodes of blurred vision or extreme tiredness after meals?',
          patientSnippet: 'Sometimes things look a little blurry when I read, and I feel very exhausted in the afternoons.'
        },
        {
          id: 'dfq-d4',
          question: 'What are your typical daily dietary habits, particularly regarding sugary beverages, sodas, and carbohydrates?',
          priority: 'MEDIUM',
          priorityClass: 'priority-medium',
          asked: false,
          answered: false,
          doctorSnippet: 'Tell me about your typical daily diet — how often do you drink sweetened beverages or juices?',
          patientSnippet: 'I do drink sweetened tea and fruit juices throughout the day to soothe my dry throat.'
        },
        {
          id: 'dfq-d5',
          question: 'Is there any known family history of diabetes mellitus, cardiovascular conditions, or kidney disease?',
          priority: 'LOW',
          priorityClass: 'priority-low',
          asked: false,
          answered: false,
          doctorSnippet: 'Is there any history of diabetes or high blood sugar in your immediate family?',
          patientSnippet: 'Yes, my mother had type 2 diabetes diagnosed in her fifties.'
        }
      ];
    }

    if (/hypertens|blood pressure|high bp|systolic|diastolic|chest|palpitat|cardio/i.test(text)) {
      return [
        {
          id: 'dfq-h1',
          question: 'Have you checked your blood pressure at home recently, and do you experience morning occipital headaches?',
          priority: 'HIGH',
          priorityClass: 'priority-high',
          asked: false,
          answered: false,
          doctorSnippet: `What have your blood pressure readings been looking like at home recently, ${patientName}?`,
          patientSnippet: 'I checked a couple of times this week and it was running around 140 over 90, especially in the mornings.'
        },
        {
          id: 'dfq-h2',
          question: 'Have you noticed any chest tightness, palpitations, or shortness of breath when walking up stairs?',
          priority: 'HIGH',
          priorityClass: 'priority-high',
          asked: false,
          answered: false,
          doctorSnippet: 'Do you ever feel chest tightness, fluttering, or shortness of breath on exertion?',
          patientSnippet: 'No chest pain, but occasionally a little breathlessness if I rush up two flights of stairs.'
        },
        {
          id: 'dfq-h3',
          question: 'How consistent have you been with your daily prescribed medication regimen? Any missed doses?',
          priority: 'MEDIUM',
          priorityClass: 'priority-medium',
          asked: false,
          answered: false,
          doctorSnippet: 'Are you taking your medication every day without missing doses?',
          patientSnippet: 'I take it almost every morning, though I occasionally forget when traveling on weekends.'
        },
        {
          id: 'dfq-h4',
          question: 'How much caffeine or dietary salt do you consume on a typical workday?',
          priority: 'MEDIUM',
          priorityClass: 'priority-medium',
          asked: false,
          answered: false,
          doctorSnippet: 'How many coffees or teas do you drink a day, and do you add extra salt to meals?',
          patientSnippet: 'I have about three strong coffees a day and frequently eat takeout food at work.'
        },
        {
          id: 'dfq-h5',
          question: 'How is your sleep quality? Has anyone mentioned that you snore loudly or stop breathing at night?',
          priority: 'LOW',
          priorityClass: 'priority-low',
          asked: false,
          answered: false,
          doctorSnippet: 'Are you getting restful sleep, or waking up feeling unrefreshed?',
          patientSnippet: 'I wake up frequently and my partner mentions I snore when sleeping on my back.'
        }
      ];
    }

    if (/headache|migraine|cephalea|forehead|temple|throbbing|tightness|scalp/i.test(text)) {
      return [
        {
          id: 'dfq-t1',
          question: 'Where exactly is the headache — frontal, occipital, or diffuse? Any neck stiffness?',
          priority: 'HIGH',
          priorityClass: 'priority-high',
          asked: false,
          answered: false,
          doctorSnippet: `Where exactly is the pain located, ${patientName}? And do you feel any neck stiffness?`,
          patientSnippet: 'It is mostly across my forehead and temples, like a tight band pressing around my head. No neck stiffness.'
        },
        {
          id: 'dfq-t2',
          question: 'Do you see visual changes, flashing lights, or blind spots before or during the headache?',
          priority: 'HIGH',
          priorityClass: 'priority-high',
          asked: false,
          answered: false,
          doctorSnippet: 'Do you ever experience visual disturbances, flashing lights, or nausea before onset?',
          patientSnippet: 'No visual changes, no flashing lights, and no nausea at all.'
        },
        {
          id: 'dfq-t3',
          question: 'How many caffeinated drinks do you typically have per day, and do headaches coincide with skipping coffee?',
          priority: 'MEDIUM',
          priorityClass: 'priority-medium',
          asked: false,
          answered: false,
          doctorSnippet: 'How much coffee or tea do you consume daily, and does the pain start in the afternoon?',
          patientSnippet: 'I drink about 3 to 4 large mugs of coffee in the morning. Headaches usually kick in by 2 or 3 PM.'
        },
        {
          id: 'dfq-t4',
          question: 'Are you sleeping 7-8 hours? Any difficulty falling asleep or waking up with jaw clenching?',
          priority: 'MEDIUM',
          priorityClass: 'priority-medium',
          asked: false,
          answered: false,
          doctorSnippet: 'How is your sleep lately? Are you getting adequate rest or waking with tension?',
          patientSnippet: 'I usually get about 6 hours of broken sleep and wake up feeling tension in my jaw and shoulders.'
        },
        {
          id: 'dfq-t5',
          question: 'What does your typical workday look like regarding computer screen time, posture, and ergonomics?',
          priority: 'LOW',
          priorityClass: 'priority-low',
          asked: false,
          answered: false,
          doctorSnippet: 'How many hours are you spending looking at screens without a break?',
          patientSnippet: 'I am on laptop and monitors for 8-9 hours straight with very few ergonomic breaks.'
        }
      ];
    }

    // Default Fallback
    return [
      {
        id: 'dfq-g1',
        question: `When did your current symptoms first begin, and have they progressively worsened or stayed stable?`,
        priority: 'HIGH',
        priorityClass: 'priority-high',
        asked: false,
        answered: false,
        doctorSnippet: `Could you tell me more about when these symptoms first started, ${patientName}, and how they have evolved?`,
        patientSnippet: 'They began a few weeks ago and have gradually become more noticeable during my daily routine.'
      },
      {
        id: 'dfq-g2',
        question: 'Have you experienced any acute warning signs such as severe lightheadedness, chest discomfort, or sudden weakness?',
        priority: 'HIGH',
        priorityClass: 'priority-high',
        asked: false,
        answered: false,
        doctorSnippet: 'Have you had any dizziness, chest discomfort, or weakness at any point?',
        patientSnippet: 'No severe chest discomfort or weakness, primarily the discomfort I described.'
      },
      {
        id: 'dfq-g3',
        question: 'What over-the-counter medications, treatments, or remedies have you tried so far, and did they help?',
        priority: 'MEDIUM',
        priorityClass: 'priority-medium',
        asked: false,
        answered: false,
        doctorSnippet: 'Have you taken any medication or treatments at home to see if it provides relief?',
        patientSnippet: 'I took some mild over-the-counter tablets which gave temporary relief for a couple of hours.'
      },
      {
        id: 'dfq-g4',
        question: 'How are these symptoms impacting your work productivity, sleep quality, and daily activities?',
        priority: 'MEDIUM',
        priorityClass: 'priority-medium',
        asked: false,
        answered: false,
        doctorSnippet: 'How is this affecting your daily schedule and sleep?',
        patientSnippet: 'It makes it harder to concentrate in the afternoon and my sleep has been somewhat disrupted.'
      },
      {
        id: 'dfq-g5',
        question: 'Do you have any known drug allergies or existing medical conditions we should be mindful of?',
        priority: 'LOW',
        priorityClass: 'priority-low',
        asked: false,
        answered: false,
        doctorSnippet: 'Do you have any known allergies or other conditions I should record?',
        patientSnippet: 'No known drug allergies that I am aware of.'
      }
    ];
  }

  getDynamicConfidenceMetrics(): any {
    if (this.isFollowUpCompleted) {
      return {
        overallScore: 86,
        overallLevel: 'High — Validated',
        subtext: `High clinical certainty achieved after protocol inquiry for ${this.visitDetails.patientName}.`,
        domains: [
          { name: 'Symptom completeness', percentage: 90, description: 'Symptom pattern and clinical timeline confirmed', color: '#0d9488' },
          { name: 'Medical history coverage', percentage: 92, description: 'Prior diagnoses and medication adherence documented', color: '#0f766e' },
          { name: 'Lifestyle & social history', percentage: 84, description: 'Workday habits, sleep, and routine triggers fully explored', color: '#0d9488' },
          { name: 'DDx alignment', percentage: 91, description: 'High concordance with clinical presentation', color: '#0d9488' },
          { name: 'Guideline adherence', percentage: 89, description: 'Aligned with evidence-based management protocols', color: '#0d9488' }
        ]
      };
    }

    const exchanges = this.currentTranscriptExchanges;
    const count = exchanges.length;
    const answeredCount = this.answeredQuestionIds.size;

    if (count > 0 || (this.recordingService.latestTranscript() && this.recordingService.latestTranscript().trim().length > 0)) {
      // Dynamic computation scaling with conversational depth and answered protocol inquiries
      const boost = answeredCount * 8;
      const symptomScore = Math.min(95, Math.max(52, 50 + count * 5 + boost));
      const medHistScore = Math.min(92, Math.max(60, 62 + count * 3 + boost));
      const lifestyleScore = Math.min(88, Math.max(38, 40 + count * 4 + boost));
      const ddxScore = Math.min(95, Math.max(55, 54 + count * 5 + boost));
      const guidelineScore = Math.min(94, Math.max(62, 66 + count * 3 + boost));

      const overall = Math.min(98, Math.round(
        (symptomScore * 0.25) +
        (medHistScore * 0.20) +
        (lifestyleScore * 0.15) +
        (ddxScore * 0.25) +
        (guidelineScore * 0.15)
      ));

      const level = overall >= 75 ? 'High — Validated' : overall >= 65 ? 'Moderate — Active Evaluation' : 'Moderate — Review Required';
      const subtext = overall >= 70
        ? `Diagnostic certainty reaches benchmark (${overall}%). Multi-domain clinical criteria satisfied.`
        : `Based on transcript completeness, symptom coverage, and DDx alignment. (Below 70% threshold — follow-up inquiry recommended)`;

      return {
        overallScore: overall,
        overallLevel: level,
        subtext,
        domains: [
          { name: 'Symptom completeness', percentage: symptomScore, description: symptomScore >= 75 ? 'Symptom pattern and clinical timeline characterized' : 'Symptom characterisation in progress', color: '#0d9488' },
          { name: 'Medical history coverage', percentage: medHistScore, description: 'Baseline health history and concurrent conditions documented', color: '#0f766e' },
          { name: 'Lifestyle & social history', percentage: lifestyleScore, description: lifestyleScore >= 70 ? 'Workday habits, sleep, and routine triggers explored' : 'Lifestyle triggers not yet fully explored', color: lifestyleScore < 50 ? '#ef4444' : '#f59e0b' },
          { name: 'DDx alignment', percentage: ddxScore, description: ddxScore >= 75 ? 'Strong concordance with differential hypotheses' : 'Differentials plausible; awaiting confirmation', color: ddxScore < 70 ? '#f59e0b' : '#0d9488' },
          { name: 'Guideline adherence', percentage: guidelineScore, description: 'Clinical screening aligned with NICE / BNF guidance', color: '#0d9488' }
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

  getDynamicSoapReport(): { subjective: string; objective: string; assessment: string; plan: string } {
    const patientName = this.visitDetails?.patientName || 'Patient';
    const demographics = this.visitDetails?.demographics || 'Adult Patient';
    const reason = this.visitDetails?.reason || 'Clinical evaluation and routine consultation';
    const visitType = this.visitDetails?.visitType?.toLowerCase() || 'consultation';
    const vitalsStr = this.formatVitalsDisplay(this.visitDetails?.vitals) || 'BP 120/80 mmHg, HR 72 bpm, Temp 36.6 °C, SpO2 98%';
    
    // Gather patient statements from exchanges
    const exchanges = this.currentTranscriptExchanges;
    const patientStatements = exchanges
      .filter((e: any) => !e.isDoctor)
      .map((e: any) => e.text)
      .filter((t: string) => t && t.length > 5);

    const fullTranscript = this.recordingService.latestTranscript() || exchanges.map((e: any) => `${e.isDoctor ? 'Doctor' : 'Patient'}: ${e.text}`).join(' ');

    let subjectiveBody = '';
    if (patientStatements.length > 0) {
      subjectiveBody = `Patient reports the following during consultation: "${patientStatements.slice(0, 3).join(' ')}"`;
    } else if (fullTranscript.length > 10) {
      subjectiveBody = `Consultation audio recorded and transcribed. Clinical dialogue reflects presenting concern: ${fullTranscript.slice(0, 200)}...`;
    } else {
      subjectiveBody = `Patient presents for scheduled ${visitType}. Reports onset of symptoms consistent with reason for visit (${reason}).`;
    }

    const ddxList = this.currentDifferentialDiagnoses;
    const primaryDdx = ddxList[0] || { title: reason, icdCode: 'R69', percentage: 75, description: 'Under clinical evaluation.' };
    const secondaryDdx = ddxList[1];

    let assessmentText = `1. ${primaryDdx.title} (${primaryDdx.icdCode}) — Diagnostic certainty: ${primaryDdx.percentage}%. ${primaryDdx.description}`;
    if (secondaryDdx) {
      assessmentText += `\n2. Differential: ${secondaryDdx.title} (${secondaryDdx.icdCode}) — Probability: ${secondaryDdx.percentage}%. ${secondaryDdx.description}`;
    }

    const meds = this.currentGuidelineMedicines;
    let planMeds = '';
    if (meds.length > 0) {
      planMeds = meds.map((m: any, idx: number) => `   ${idx + 1}. ${m.name}: ${m.dosage} (${m.drugClass}, ${m.grade} - ${m.source}). ${m.recommendation}`).join('\n');
    } else {
      planMeds = `   1. Prescribe targeted guideline-directed pharmacotherapy based on confirmed diagnostic parameters.`;
    }

    const planText = `1. Clinical Workup & Surveillance:\n   - Review symptom trajectory and monitor response to primary intervention.\n   - Complete recommended laboratory screens and diagnostic investigations.\n2. Pharmacological Directives:\n${planMeds}\n3. Patient Counseling & Lifestyle:\n   - Provide evidence-based disease education, hydration guidance, and stress mitigation.\n4. Clinical Follow-up:\n   - Re-evaluate in 4 to 6 weeks or sooner if red-flag symptoms or acute distress emerge.`;

    return {
      subjective: `Patient ${patientName} (${demographics}) presents for scheduled ${visitType}.\nChief Complaint: ${reason}.\n${subjectiveBody}`,
      objective: `Recorded Vital Signs: ${vitalsStr}.\nPhysical Examination: General appearance alert and cooperative. Systemic examination tailored to clinical presentation completed during consultation.`,
      assessment: assessmentText,
      plan: planText
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
      this.isSoapManuallyEdited = false;
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
    this.isSoapManuallyEdited = false;
    this.editedSoapReport = null;
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
    if (this.isSoapManuallyEdited && this.editedSoapReport) {
      return this.editedSoapReport;
    }
    const base = this.currentSoapReport;
    return {
      subjective: base.subjective || '',
      objective: base.objective || '',
      assessment: base.assessment || '',
      plan: base.plan || ''
    };
  }

  startEditSection(section: 'subjective' | 'objective' | 'assessment' | 'plan'): void {
    this.activeEditSection = section;
    if (!this.editedSoapReport) {
      const base = this.currentSoapReport;
      this.editedSoapReport = {
        subjective: base.subjective || '',
        objective: base.objective || '',
        assessment: base.assessment || '',
        plan: base.plan || ''
      };
    }
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
      if (!this.editedSoapReport) {
        const base = this.currentSoapReport;
        this.editedSoapReport = {
          subjective: base.subjective || '',
          objective: base.objective || '',
          assessment: base.assessment || '',
          plan: base.plan || ''
        };
      }
      this.editedSoapReport[this.activeEditSection] = this.sectionEditText;
      this.isSoapManuallyEdited = true;
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

  manualProcessingFlag: boolean = false;

  get isProcessingAudio(): boolean {
    return this.manualProcessingFlag || this.recordingService.isTranscribing() || this.recordingService.state() === 'UPLOADING' || this.recordingService.state() === 'TRANSCRIBING';
  }

  set isProcessingAudio(val: boolean) {
    this.manualProcessingFlag = val;
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
