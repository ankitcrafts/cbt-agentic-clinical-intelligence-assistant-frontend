import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { RecordingService } from '../../../core/services/recording.service';
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

  // Doctor Header Details
  doctorGreeting = 'Good morning, Dr. Tanaka';
  todayDateFormatted = 'Wednesday, August 13';
  hospitalInfo = 'Cardiology · St. Mercy Hospital';
  dutyStatus = 'On duty';
  doctorInitials = 'YT';

  // Patient Queue / Schedule Data
  patientsQueue = [
    {
      id: '#00847261',
      name: 'Marcus Delgado',
      initials: 'MD',
      age: 42,
      gender: 'M',
      demographics: '42M · #00847261',
      time: '09:00',
      duration: '30 min',
      visitType: 'Follow-up',
      reason: 'Hypertension review + new headache complaint',
      condition: 'Hypertension Stage 1',
      status: 'IN_PROGRESS',
      statusLabel: 'In Progress',
      lastVisit: 'July 14, 2026',
      vitals: { bp: '138/88 mmHg', hr: '72 bpm', pain: '5-6/10' }
    },
    {
      id: '#00391847',
      name: 'Priya Sharma',
      initials: 'PS',
      age: 34,
      gender: 'F',
      demographics: '34F · #00391847',
      time: '09:45',
      duration: '20 min',
      visitType: 'Consultation',
      reason: 'Persistent fatigue, thyroid history',
      condition: 'Hypothyroidism',
      status: 'WAITING',
      statusLabel: 'Waiting',
      lastVisit: 'May 02, 2026',
      vitals: { bp: '118/76 mmHg', hr: '68 bpm', pain: '0/10' }
    },
    {
      id: '#00512938',
      name: 'Elias Voss',
      initials: 'EV',
      age: 58,
      gender: 'M',
      demographics: '58M · #00512938',
      time: '10:15',
      duration: '30 min',
      visitType: 'Annual Check',
      reason: 'Routine annual review, diabetes management',
      condition: 'Type 2 Diabetes',
      status: 'WAITING',
      statusLabel: 'Waiting',
      lastVisit: 'Feb 11, 2026',
      vitals: { bp: '132/84 mmHg', hr: '74 bpm', pain: '0/10' }
    },
    {
      id: '#00673920',
      name: 'Anya Kowalski',
      initials: 'AK',
      age: 29,
      gender: 'F',
      demographics: '29F · #00673920',
      time: '11:00',
      duration: '45 min',
      visitType: 'New Patient',
      reason: 'Chest tightness, shortness of breath on exertion',
      condition: 'New presentation',
      status: 'SCHEDULED',
      statusLabel: 'Scheduled',
      lastVisit: '—',
      vitals: { bp: '122/80 mmHg', hr: '82 bpm', pain: '3/10' }
    },
    {
      id: '#00182736',
      name: 'Samuel Obi',
      initials: 'SO',
      age: 67,
      gender: 'M',
      demographics: '67M · #00182736',
      time: '11:55',
      duration: '20 min',
      visitType: 'Follow-up',
      reason: 'Post-catheterisation review, stable angina',
      condition: 'Stable Angina',
      status: 'SCHEDULED',
      statusLabel: 'Scheduled',
      lastVisit: 'June 20, 2026',
      vitals: { bp: '128/82 mmHg', hr: '64 bpm', pain: '1/10' }
    },
    {
      id: '#00847193',
      name: 'Lin Wei',
      initials: 'LW',
      age: 45,
      gender: 'F',
      demographics: '45F · #00847193',
      time: '14:00',
      duration: '30 min',
      visitType: 'Follow-up',
      reason: 'AF management, medication titration',
      condition: 'Atrial Fibrillation',
      status: 'SCHEDULED',
      statusLabel: 'Scheduled',
      lastVisit: 'March 18, 2026',
      vitals: { bp: '126/80 mmHg', hr: '76 bpm', pain: '0/10' }
    }
  ];

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

  // Image 4: AI Suggestions List
  aiSuggestionsList = [
    {
      id: 1,
      type: 'high',
      tag: 'HIGH · SYMPTOM DETAIL',
      text: 'Ask about location and quality of headache — tension vs. vascular patterns differ in management.'
    },
    {
      id: 2,
      type: 'high',
      tag: 'HIGH · DIFFERENTIAL',
      text: 'Has the patient noticed any visual disturbances or aura before onset? Important to rule out migraine.'
    },
    {
      id: 3,
      type: 'medium',
      tag: 'MEDIUM · LIFESTYLE',
      text: 'Screen for caffeine intake — afternoon timing correlates with caffeine withdrawal in regular coffee drinkers.'
    }
  ];

  // Image 3: 5-Tab CDS Active Tab
  activeTab: 'analysis' | 'clinical' | 'medicines' | 'confidence' | 'soap' = 'analysis';

  // Image 3: Tab 1 (Analysis & Summary)
  clinicalSummary = '42-year-old male with known Stage 1 hypertension presents with recurrent afternoon headaches over 4–5 weeks. Reports moderate severity (5–6/10), lasting ~1 hour. Adherent to Lisinopril; Atorvastatin compliance unconfirmed. Home BP monitoring infrequent. No acute cardiac symptoms.';

  keyFindings = [
    { label: 'CHIEF COMPLAINT', value: 'Recurrent afternoon headaches' },
    { label: 'FREQUENCY', value: '4–5×/week, ~1 hr duration' },
    { label: 'PAIN SCORE', value: '5–6/10 (moderate)' },
    { label: 'BP (LAST VISIT)', value: '138/88 mmHg' },
    { label: 'MEDICATION ADHERENCE', value: 'Lisinopril ✓ · Statin ?' },
    { label: 'HOME MONITORING', value: '~1x/week (suboptimal)' }
  ];

  identifiedIssues = [
    { text: 'Suboptimally controlled hypertension', type: 'warning', dotColor: '#f59e0b' },
    { text: 'New onset recurrent headache — aetiology undetermined', type: 'danger', dotColor: '#ef4444' },
    { text: 'Low home BP monitoring adherence', type: 'warning', dotColor: '#f59e0b' },
    { text: 'Lipid panel overdue — no recent cholesterol check', type: 'info', dotColor: '#3b82f6' }
  ];

  // Image 3: Tab 2 (Clinical Decision)
  differentialDiagnoses = [
    {
      rank: 1,
      title: 'Essential Hypertension',
      icdCode: 'I10',
      risk: 'high',
      riskLabel: 'high',
      percentage: 88,
      color: '#0d9488',
      description: 'Persistent elevated BP, on Lisinopril; strong pattern match.'
    },
    {
      rank: 2,
      title: 'Tension-Type Headache',
      icdCode: 'G44.2',
      risk: 'high',
      riskLabel: 'high',
      percentage: 71,
      color: '#0d9488',
      description: 'Afternoon onset, moderate severity; correlates with screen-time pattern.'
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
      color: '#14b8a6',
      description: 'Timing consistent. Caffeine history not yet confirmed.'
    },
    {
      rank: 5,
      title: 'Secondary Hypertension (renal)',
      icdCode: 'I15.1',
      risk: 'low',
      riskLabel: 'low',
      percentage: 22,
      color: '#5eead4',
      description: 'No renal workup documented. Rule out if BP control worsens.'
    }
  ];

  clinicalRedFlags = [
    {
      tag: 'CRITICAL',
      title: 'New headache at consistent time — rule out raised ICP',
      action: 'Neurological exam recommended today'
    }
  ];

  // Image 3: Tab 3 (Medicines)
  guidelineMedicines = [
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
      source: 'NICE CG180',
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

  // Image 3: Tab 4 (Confidence)
  confidenceMetrics = {
    overallScore: 94.2,
    overallLevel: 'High Confidence',
    pipeline: [
      { name: 'Whisper ASR Transcription', score: 98.5, status: 'Optimal' },
      { name: 'Clinical NER Entity Extraction', score: 92.8, status: 'High' },
      { name: 'Guideline RAG Retrieval Similarity', score: 96.1, status: 'Optimal' },
      { name: 'Differential Diagnostic Calibration', score: 89.4, status: 'Validated' }
    ],
    guidelinesCited: ['NICE CG180 (Headache & HTN)', 'JNC-8 Protocol', 'BNF 84 Formulary', 'SIGN 155'],
    hallucinationRisk: '0.9% (Near Zero)',
    unverifiedFacts: 1
  };

  // Image 3: Tab 5 (SOAP Report)
  soapReportData = {
    subjective: '42yo male with Stage 1 HTN presenting with recurrent afternoon headaches (4-5x/wk, 5-6/10 pain) for 4-5 weeks. Lisinopril 10mg taken regularly; statin adherence unverified. Infrequent home BP monitoring.',
    objective: 'BP at last visit: 138/88 mmHg. Pulse: 72 bpm regular. Physical exam: Alert, oriented x3. No focal neurological deficits.',
    assessment: '1. Stage 1 Essential Hypertension (suboptimally controlled).\n2. Tension-Type Headache vs Caffeine-Withdrawal Headache.\n3. Statin adherence unconfirmed.',
    plan: '1. Continue Lisinopril 10mg PO QD; initiate home BP log (morning/evening).\n2. Consider Amlodipine 5mg daily adjunct if systolic remains >140 after 8 weeks.\n3. Advise headache trigger diary & assess afternoon caffeine intake.\n4. Repeat lipid panel and comprehensive follow-up in 2 weeks.'
  };

  // Live Transcript Exchanges
  transcriptExchanges = [
    {
      id: 1,
      speaker: 'YT',
      speakerName: 'Dr. Yuki Tanaka',
      isDoctor: true,
      text: 'Good morning, Marcus. How have you been feeling since our last visit?'
    },
    {
      id: 2,
      speaker: 'MD',
      speakerName: 'Marcus Delgado',
      isDoctor: false,
      text: "Mostly okay, but I've been getting these headaches in the afternoon. Usually around 2 or 3pm."
    },
    {
      id: 3,
      speaker: 'YT',
      speakerName: 'Dr. Yuki Tanaka',
      isDoctor: true,
      text: 'How often are these headaches occurring? Daily, a few times a week?'
    },
    {
      id: 4,
      speaker: 'MD',
      speakerName: 'Marcus Delgado',
      isDoctor: false,
      text: 'Maybe four or five times a week. They last about an hour.'
    },
    {
      id: 5,
      speaker: 'YT',
      speakerName: 'Dr. Yuki Tanaka',
      isDoctor: true,
      text: 'On a scale of 1 to 10, how would you rate the pain?'
    },
    {
      id: 6,
      speaker: 'MD',
      speakerName: 'Marcus Delgado',
      isDoctor: false,
      text: 'Maybe a 5 or 6. Uncomfortable but I can still work through them.'
    },
    {
      id: 7,
      speaker: 'YT',
      speakerName: 'Dr. Yuki Tanaka',
      isDoctor: true,
      text: 'Have you noticed any specific pattern or triggers before they start?'
    },
    {
      id: 8,
      speaker: 'MD',
      speakerName: 'Marcus Delgado',
      isDoctor: false,
      text: 'Not really, though I do tend to drink coffee around noon.'
    },
    {
      id: 9,
      speaker: 'YT',
      speakerName: 'Dr. Yuki Tanaka',
      isDoctor: true,
      text: 'Are you taking your Lisinopril 10mg daily as prescribed, and checking your blood pressure at home?'
    },
    {
      id: 10,
      speaker: 'MD',
      speakerName: 'Marcus Delgado',
      isDoctor: false,
      text: 'I take the Lisinopril every morning without fail, but I only check my BP about once a week.'
    }
  ];

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.recordingService.state() === 'RECORDING' || this.recordingService.state() === 'PAUSED') {
      this.recordingService.stopRecording();
    } else {
      this.recordingService.stopMicrophoneTracks();
    }
  }

  // Open consultation for selected patient -> ALWAYS opens Image 4 (Suggestions & Patient Card)
  openConsultation(patient: any): void {
    this.visitDetails = {
      patientName: patient.name,
      visitId: patient.id.startsWith('#') ? patient.id : '#' + patient.id,
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
    this.mockData.activeConsultation.update(prev => ({
      ...prev,
      patientName: patient.name,
      patientAge: patient.age,
      patientGender: patient.gender === 'M' ? 'Male' : 'Female',
      patientPid: patient.id,
      reasonForVisit: patient.reason
    }));

    // Start with Image 4 (Patient Card + AI Suggestions + Run Clinical Analysis button)
    this.rightPanelMode = 'suggestions';
    this.viewMode = 'consultation';
  }

  // On clicking "Run Clinical Analysis" -> switches right column to Image 3 (5-Tab CDS Panel)
  runClinicalAnalysis(): void {
    this.rightPanelMode = 'analysis';
    this.activeTab = 'analysis';
  }

  // Switch back to Image 4 (Suggestions)
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

  // Recording methods
  async startRecording(): Promise<void> {
    try {
      const activeCons = this.mockData.activeConsultation();
      await this.recordingService.startRecording({
        encounterId: activeCons.id || 'CONS-41233',
        doctorId: 'DOC-001',
        patientId: activeCons.patientPid || 'P1245'
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
    const activeCons = this.mockData.activeConsultation();
    await this.recordingService.stopRecording({
      encounterId: activeCons.id || 'CONS-41233',
      doctorId: 'DOC-001',
      patientId: activeCons.patientPid || 'P1245'
    });
  }

  uploadRecording(): void {
    const activeCons = this.mockData.activeConsultation();
    this.recordingService.uploadRecording({
      encounterId: activeCons.id || 'CONS-41233',
      doctorId: 'DOC-001',
      patientId: activeCons.patientPid || 'P1245'
    }).subscribe({
      next: (res) => console.log('Upload successful:', res),
      error: (err) => console.error('Upload failed:', err)
    });
  }

  retryUpload(): void {
    this.uploadRecording();
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
