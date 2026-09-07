import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { RecordingService } from '../../../core/services/recording.service';
import { AppointmentService } from '../../../core/services/appointment.service';
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

  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;

  // View state: 'queue' (Schedule & Patient List) | 'consultation' (Active Consultation View)
  viewMode: 'queue' | 'consultation' = 'queue';

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

  // Dynamic Patient Queue / Schedule Data from AppointmentService
  get patientsQueue() {
    const user = this.authService.currentUser();
    const docName = user?.name || 'Dr. Yuki Tanaka';
    const queue = this.appointmentService.getDoctorQueue(docName);
    
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

  // Patient Consultation Session History (from PostgreSQL DB)
  patientSessions: any[] = [];
  selectedSessionId: string = 'live';

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.recordingService.state() === 'RECORDING' || this.recordingService.state() === 'PAUSED') {
      this.recordingService.stopRecording();
    } else {
      this.recordingService.stopMicrophoneTracks();
    }
  }

  // Open consultation for selected patient -> switches patient recording context
  openConsultation(patient: any): void {
    const patientId = patient.id.startsWith('#') ? patient.id : '#' + patient.id;

    // Switch patient context in recording service (loads that patient's session or initializes clean)
    this.recordingService.switchPatient(patientId);
    this.transcriptExchanges = [];
    this.patientSessions = [];
    this.selectedSessionId = 'live';
    this.editedSoapReport = null;

    this.visitDetails = {
      patientName: patient.name,
      visitId: patientId,
      initials: patient.initials || 'AK',
      demographics: patient.demographics || `${patient.age}${patient.gender} · ${patient.id}`,
      visitType: patient.visitType,
      reason: patient.reason,
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
        // If there are recorded past sessions and doctor hasn't started recording, load the most recent session
        if (this.patientSessions.length > 0 && this.recordingService.state() === 'IDLE' && (!currentEx || currentEx.length === 0)) {
          const latest = this.patientSessions[this.patientSessions.length - 1];
          this.selectSession(latest);
        }
      },
      error: (err) => console.warn('Failed to load consultation sessions for patient:', err)
    });

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
  }

  selectLiveSession(): void {
    this.selectedSessionId = 'live';
    const patientId = this.visitDetails.visitId;
    this.recordingService.switchPatient(patientId);
    this.transcriptExchanges = [];
    this.editedSoapReport = null;
    this.patientSummaryText = '';
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
        doctorId: 'DOC-001',
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
        doctorId: 'DOC-001',
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
      doctorId: 'DOC-001',
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
      doctorId: 'DOC-001',
      patientId: pid,
      doctorName: 'Dr. Yuki Tanaka',
      patientName: this.visitDetails.patientName || 'Patient',
      doctorInitials: 'YT',
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

  get currentClinicalSummary(): string {
    const analysis = this.recordingService.latestClinicalAnalysis();
    if (analysis?.summary) {
      if (typeof analysis.summary === 'string') return analysis.summary;
      if (analysis.summary.clinical_summary) return analysis.summary.clinical_summary;
      if (analysis.summary.narrative_summary) return analysis.summary.narrative_summary;
      if (analysis.summary.history_of_present_illness) return `${analysis.summary.chief_complaint || ''} — ${analysis.summary.history_of_present_illness}`;
      return JSON.stringify(analysis.summary);
    }
    return `No clinical summary generated yet. Record or upload consultation audio for ${this.visitDetails.patientName} to generate an AI summary.`;
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
    return [
      { label: 'CHIEF COMPLAINT', value: this.visitDetails.reason },
      { label: 'VISIT TYPE', value: this.visitDetails.visitType },
      { label: 'CONDITION', value: this.visitDetails.condition },
      { label: 'STATUS', value: 'Awaiting Consultation Recording' }
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
    return [
      { text: `${this.visitDetails.condition} — under evaluation`, type: 'info', dotColor: '#3b82f6' }
    ];
  }

  get currentDifferentialDiagnoses(): any[] {
    const analysis = this.recordingService.latestClinicalAnalysis();
    const ddx = analysis?.differential_diagnosis || analysis?.differentialDiagnosis;
    if (Array.isArray(ddx) && ddx.length > 0) {
      return ddx.map((d: any, idx: number) => {
        const rawConf = d.confidence ?? d.confidence_score ?? d.llm_confidence ?? (d.percentage ? d.percentage / 100 : null);
        const pct = Math.round(rawConf != null ? (rawConf <= 1 ? rawConf * 100 : rawConf) : (d.percentage || (idx === 0 ? 88 : idx === 1 ? 71 : idx === 2 ? 54 : idx === 3 ? 45 : 22)));
        const risk = (d.risk_level || d.risk || d.confidence_level || (pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low')).toLowerCase();
        const color = d.color || (risk === 'high' ? '#0d9488' : risk === 'medium' ? '#f59e0b' : '#2dd4bf');
        return {
          rank: idx + 1,
          title: d.name || d.title || d.diagnosis || d.condition || `Differential #${idx + 1}`,
          icdCode: d.icd10_code || d.icd_code || d.icdCode || (idx === 0 ? 'I10' : idx === 1 ? 'G44.2' : idx === 2 ? 'R03.0' : idx === 3 ? 'G44.83' : 'I15.1'),
          risk: risk,
          riskLabel: risk,
          percentage: pct,
          color: color,
          description: d.reason || d.rationale || d.description || d.clinical_evidence || (idx === 0 ? 'Persistent elevated BP, on Lisinopril, strong pattern match.' : idx === 1 ? 'Afternoon onset, moderate severity, correlates with screen-time pattern.' : idx === 2 ? 'Home readings infrequent; clinic readings consistently higher.' : idx === 3 ? 'Timing consistent. Caffeine history not yet confirmed.' : 'No renal workup documented. Rule out if BP control worsens.')
        };
      });
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
    const analysis = this.recordingService.latestClinicalAnalysis();
    const flags = analysis?.red_flags || analysis?.redFlags;
    if (Array.isArray(flags) && flags.length > 0) {
      return flags.map((f: any) => ({
        severity: f.severity || 'CRITICAL',
        title: f.title || (typeof f === 'string' ? f : 'Clinical warning sign observed'),
        recommendation: f.recommendation || 'Neurological exam recommended today'
      }));
    }
    if (analysis?.entities?.warning_signs && analysis.entities.warning_signs.length > 0) {
      return analysis.entities.warning_signs.map((w: any) => ({
        severity: 'CRITICAL',
        title: typeof w === 'string' ? w : (w.title || w.sign || 'Clinical warning sign observed'),
        recommendation: typeof w === 'object' && w.recommendation ? w.recommendation : 'Neurological exam recommended today'
      }));
    }
    return [
      {
        severity: 'CRITICAL',
        title: 'New headache at consistent time — rule out raised ICP',
        recommendation: 'Neurological exam recommended today'
      }
    ];
  }

  get currentGuidelineMedicines(): any[] {
    const analysis = this.recordingService.latestClinicalAnalysis();
    const meds = analysis?.guideline_medicines || analysis?.guidelineMedicines || analysis?.medicines;
    if (Array.isArray(meds) && meds.length > 0) {
      return meds.map((m: any) => ({
        name: m.name || m.medication || 'Medication',
        drugClass: m.drug_class || m.drugClass || m.class || 'CCB',
        grade: m.grade || 'Grade A',
        source: m.source || 'NICE Guidelines',
        dosage: m.dosage ? `${m.dosage}` : 'As directed',
        recommendation: m.recommendation || m.instructions || 'Review adherence and therapeutic response.',
        warning: m.warning || m.warnings || m.side_effects || 'Monitor patient tolerability.'
      }));
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
    const analysis = this.recordingService.latestClinicalAnalysis();
    const conf = analysis?.confidence_metrics || analysis?.confidenceMetrics;
    if (conf && conf.overallScore != null && Array.isArray(conf.domains) && conf.domains.length > 0) {
      return conf;
    }
    return {
      overallScore: 58,
      overallLevel: 'Moderate — Review',
      subtext: 'Based on transcript completeness, symptom coverage, and DDx alignment.',
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

  exportSoapPdf(): void {
    this.activeTab = 'soap';
    setTimeout(() => {
      window.print();
    }, 50);
  }

  printSoapNote(): void {
    this.activeTab = 'soap';
    setTimeout(() => {
      window.print();
    }, 50);
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
      doctor_id: 'DOC-001',
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
        this.saveStatusMessage = `✓ SOAP Report & Doctor Feedback persisted to database successfully (ID: ${res.id}).`;
        if (res.patientSummary) {
          this.patientSummaryText = res.patientSummary;
        }
      },
      error: (err) => {
        this.isSavingFeedback = false;
        console.error('Save SOAP feedback error:', err);
        this.saveStatusMessage = 'Error saving SOAP feedback to database.';
      }
    });
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
