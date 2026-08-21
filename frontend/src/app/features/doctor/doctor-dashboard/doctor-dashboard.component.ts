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

  // View state: 'queue' (Patient list before consultation) | 'consultation' (Live Consultation Support)
  viewMode: 'queue' | 'consultation' = 'queue';
  searchTerm: string = '';
  statusFilter: string = 'ALL';

  isPlayingPreview = false;
  activePlayingSessionId: string | null = null;
  activePlayingAudioUrl: string | null = null;

  // Patient Queue Data
  patientsQueue = [
    {
      id: 'P-2026-0813',
      name: 'Marcus Delgado',
      initials: 'MD',
      age: 42,
      gender: 'Male',
      time: '09:14 AM',
      visitType: 'Cardiology follow-up',
      reason: 'Recurrent afternoon headaches & Stage 1 HTN',
      vitals: { bp: '138/88 mmHg', hr: '72 bpm', pain: '5-6/10' },
      status: 'IN_PROGRESS',
      statusLabel: 'In Progress',
      priority: 'high',
      isPrimary: true
    },
    {
      id: 'P-1245',
      name: 'Priya Verma',
      initials: 'PV',
      age: 32,
      gender: 'Female',
      time: '10:00 AM',
      visitType: 'Hypertension review',
      reason: 'Dizziness and neck pain follow-up',
      vitals: { bp: '120/80 mmHg', hr: '68 bpm', pain: '2/10' },
      status: 'WAITING',
      statusLabel: 'Waiting (12 min)',
      priority: 'medium',
      isPrimary: false
    },
    {
      id: 'P-1246',
      name: 'Rohan Mehta',
      initials: 'RM',
      age: 45,
      gender: 'Male',
      time: '10:45 AM',
      visitType: 'Routine checkup',
      reason: 'Persistent elevated BP on home log',
      vitals: { bp: '142/90 mmHg', hr: '80 bpm', pain: '0/10' },
      status: 'WAITING',
      statusLabel: 'Waiting (5 min)',
      priority: 'high',
      isPrimary: false
    },
    {
      id: 'P-1247',
      name: 'Ananya Singh',
      initials: 'AS',
      age: 28,
      gender: 'Female',
      time: '11:30 AM',
      visitType: 'Migraine Follow-up',
      reason: 'Screen-time related tension headaches',
      vitals: { bp: '118/76 mmHg', hr: '70 bpm', pain: '4/10' },
      status: 'SCHEDULED',
      statusLabel: 'Scheduled',
      priority: 'low',
      isPrimary: false
    },
    {
      id: 'P-1248',
      name: 'Suresh Kumar',
      initials: 'SK',
      age: 55,
      gender: 'Male',
      time: '08:30 AM',
      visitType: 'Post-Rx Review',
      reason: 'Cholesterol and hypertensive control review',
      vitals: { bp: '130/84 mmHg', hr: '74 bpm', pain: '0/10' },
      status: 'COMPLETED',
      statusLabel: 'Completed',
      priority: 'low',
      isPrimary: false
    }
  ];

  visitDetails = {
    patientName: 'Marcus Delgado',
    visitId: '#2026-08-13',
    reason: 'Cardiology follow-up',
    date: 'Aug 13, 2026',
    time: '09:14 AM',
    duration: '18 min 42 sec'
  };

  activeTab: 'analysis' | 'clinical' | 'medicines' | 'confidence' | 'soap' = 'analysis';

  clinicalSummary = '42-year-old male with known Stage 1 hypertension presents with recurrent afternoon headaches over 4–5 weeks. Reports moderate severity (5–6/10), lasting ~1 hour. Adherent to Lisinopril; Atorvastatin compliance unconfirmed. Home BP monitoring infrequent. No acute cardiac symptoms.';

  keyFindings = [
    { label: 'CHIEF COMPLAINT', value: 'Recurrent afternoon headaches' },
    { label: 'FREQUENCY', value: '4–5×/week, ~1 hr duration' },
    { label: 'PAIN SCORE', value: '5–6/10 (moderate)' },
    { label: 'BP (LAST VISIT)', value: '138/88 mmHg' },
    { label: 'MEDICATION ADHERENCE', value: 'Lisinopril: ✓  Statin: ?' },
    { label: 'HOME MONITORING', value: '~1x/week (suboptimal)' }
  ];

  identifiedIssues = [
    { text: 'Suboptimally controlled hypertension', type: 'warning', dotColor: '#f59e0b' },
    { text: 'New onset recurrent headache — aetiology undetermined', type: 'danger', dotColor: '#ef4444' },
    { text: 'Low home BP monitoring adherence', type: 'warning', dotColor: '#f59e0b' },
    { text: 'Lipid panel overdue — no recent cholesterol check', type: 'info', dotColor: '#3b82f6' }
  ];

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

  soapReportData = {
    subjective: '42yo male with Stage 1 HTN presenting with recurrent afternoon headaches (4-5x/wk, 5-6/10 pain) for 4-5 weeks. Lisinopril 10mg taken regularly; statin adherence unverified. Infrequent home BP monitoring.',
    objective: 'BP at last visit: 138/88 mmHg. Pulse: 72 bpm regular. Physical exam: Alert, oriented x3. No focal neurological deficits.',
    assessment: '1. Stage 1 Essential Hypertension (suboptimally controlled).\n2. Tension-Type Headache vs Caffeine-Withdrawal Headache.\n3. Statin adherence unconfirmed.',
    plan: '1. Continue Lisinopril 10mg PO QD; initiate home BP log (morning/evening).\n2. Consider Amlodipine 5mg daily adjunct if systolic remains >140 after 8 weeks.\n3. Advise headache trigger diary & assess afternoon caffeine intake.\n4. Repeat lipid panel and comprehensive follow-up in 2 weeks.'
  };

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

  aiQuestions = [
    {
      id: 1,
      priority: 'high',
      priorityLabel: 'high',
      tag: 'SYMPTOM DETAIL',
      question: 'Ask about location and quality of headache — tension vs. vascular patterns differ in management.'
    },
    {
      id: 2,
      priority: 'high',
      priorityLabel: 'high',
      tag: 'DIFFERENTIAL',
      question: 'Has the patient noticed any visual disturbances or aura before onset? Important to rule out migraine.'
    },
    {
      id: 3,
      priority: 'medium',
      priorityLabel: 'medium',
      tag: 'LIFESTYLE',
      question: 'Screen for caffeine intake — afternoon timing correlates with caffeine withdrawal in regular coffee drinkers.'
    },
    {
      id: 4,
      priority: 'medium',
      priorityLabel: 'medium',
      tag: 'LIFESTYLE',
      question: 'Assess sleep quality and duration — headaches at consistent times can indicate disrupted sleep cycles.'
    },
    {
      id: 5,
      priority: 'low',
      priorityLabel: 'low',
      tag: 'ENVIRONMENT',
      question: 'Consider asking about workplace ergonomics — screen time and posture are common triggers.'
    }
  ];

  patientSnapshot = {
    condition: 'Hypertension Stage 1',
    currentRx: 'Lisinopril 10mg, Atorvastatin 20mg',
    lastVisit: 'July 14, 2026',
    bpAtLastVisit: '138/88 mmHg',
    nextFollowUp: 'Aug 25, 2026'
  };

  setActiveTab(tab: 'analysis' | 'clinical' | 'medicines' | 'confidence' | 'soap') {
    this.activeTab = tab;
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    if (this.recordingService.state() === 'RECORDING' || this.recordingService.state() === 'PAUSED') {
      this.recordingService.stopRecording();
    } else {
      this.recordingService.stopMicrophoneTracks();
    }
  }

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
      next: (res) => {
        console.log('Upload successful:', res);
      },
      error: (err) => {
        console.error('Upload failed:', err);
      }
    });
  }

  retryUpload(): void {
    this.uploadRecording();
  }

  downloadRecording(): void {
    this.recordingService.downloadRecording();
  }


  togglePreviewPlayback(): void {
    const audioEl = this.audioPlayerRef?.nativeElement;
    if (!audioEl) return;

    if (this.isPlayingPreview) {
      audioEl.pause();
      this.isPlayingPreview = false;
    } else {
      audioEl.play().then(() => {
        this.isPlayingPreview = true;
      }).catch(err => {
        console.error('Playback error:', err);
      });
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

  onAudioEnded(): void {
    this.isPlayingPreview = false;
    this.activePlayingSessionId = null;
  }

  dismissQuestion(id: number) {
    this.aiQuestions = this.aiQuestions.filter(q => q.id !== id);
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

  openConsultation(patient: any): void {
    this.visitDetails = {
      patientName: patient.name,
      visitId: '#' + patient.id,
      reason: patient.visitType,
      date: 'Aug 13, 2026',
      time: patient.time,
      duration: '18 min 42 sec'
    };
    this.viewMode = 'consultation';
  }

  backToQueue(): void {
    this.viewMode = 'queue';
  }

  get filteredPatients() {
    return this.patientsQueue.filter(p => {
      const matchSearch = !this.searchTerm || 
        p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
        p.id.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.reason.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchStatus = this.statusFilter === 'ALL' || p.status === this.statusFilter;
      return matchSearch && matchStatus;
    });
  }

  get totalAppointmentsCount(): number {
    return this.patientsQueue.length;
  }

  get waitingCount(): number {
    return this.patientsQueue.filter(p => p.status === 'WAITING' || p.status === 'SCHEDULED').length;
  }

  get inProgressCount(): number {
    return this.patientsQueue.filter(p => p.status === 'IN_PROGRESS').length;
  }

  get completedCount(): number {
    return this.patientsQueue.filter(p => p.status === 'COMPLETED').length;
  }

  get hasPendingUploads(): boolean {
    return this.recordedSessions.some(s => s.status !== 'UPLOADED');
  }
}

