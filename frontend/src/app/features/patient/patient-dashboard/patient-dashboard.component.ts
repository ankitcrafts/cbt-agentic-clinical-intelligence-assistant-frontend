import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  appointmentService = inject(AppointmentService);

  activeTab: 'alerts' | 'records' | 'prescriptions' | 'consultations' = 'alerts';
  isLoading: boolean = false;
  hasSharedSoap: boolean = false;
  latestSharedSoap: any = null;
  showSoapModal: boolean = false;
  selectedSoapReport: any = null;

  // Consultations Screen & Transcript Modal State
  consultations: any[] = [
    {
      id: 'sess-base-2',
      sessionNumber: 2,
      sessionTitle: 'Cardiology Review & Medication Titration',
      doctorName: 'Dr. Yuki Tanaka',
      doctorId: 'DOC-001',
      doctorSpecialty: 'Senior Cardiologist',
      date: '2026-07-14',
      consultationMode: 'In-Person Consultation',
      status: 'COMPLETED',
      isShared: true,
      summary: 'Follow-up consultation for Stage 1 Hypertension. Reviewed patient daily BP logs showing marked stabilization with Lisinopril 10mg. Patient reports tension headaches have resolved. Sodium restriction and aerobic walking routine verified.',
      assessment: 'Essential Hypertension Stage 1 (ICD-10: I10), well controlled under current regimen.',
      plan: '1. Continue Lisinopril 10mg once daily in morning.\n2. Maintain low-sodium DASH dietary regimen.\n3. Schedule repeat lipid profile & BP recheck in 6 weeks.',
      subjective: 'Marcus reports feeling much better with no morning headaches. Complies with Lisinopril 10mg daily. Has reduced dietary sodium and begun brisk walking 20 mins daily.',
      objective: 'BP: 138/88 mmHg, HR: 72 bpm, Weight: 81 kg, Temp: 36.6 °C. Heart sounds S1/S2 normal, no murmurs. Lungs clear.',
      vitals: {
        bp: '138/88 mmHg',
        hr: '72 bpm',
        weight: '81 kg',
        temp: '36.6 °C'
      },
      conversation: [
        { speaker: 'Doctor', role: 'doctor', text: 'Good morning Marcus, how have you been feeling since starting the Lisinopril medication?', time: '00:05' },
        { speaker: 'Patient', role: 'patient', text: 'Good morning Doctor. The morning headaches have stopped and my home BP monitor shows lower numbers.', time: '00:15' },
        { speaker: 'Doctor', role: 'doctor', text: 'That is wonderful progress. Your reading today is 138/88 mmHg. We will continue this dosage, keep up the sodium reduction, and follow up in 6 weeks.', time: '00:30' }
      ],
      transcript: 'Doctor: Good morning Marcus, how have you been feeling since starting the Lisinopril medication?\nPatient: Good morning Doctor. The morning headaches have stopped and my home BP monitor shows lower numbers.\nDoctor: That is wonderful progress. Your reading today is 138/88 mmHg. We will continue this dosage, keep up the sodium reduction, and follow up in 6 weeks.',
      soapReport: {
        subjective: 'Marcus reports feeling much better with no morning headaches. Complies with Lisinopril 10mg daily. Has reduced dietary sodium and begun brisk walking 20 mins daily.',
        objective: 'BP: 138/88 mmHg, HR: 72 bpm, Weight: 81 kg, Temp: 36.6 °C. Heart sounds S1/S2 normal, no murmurs. Lungs clear.',
        assessment: 'Essential Hypertension Stage 1 (ICD-10: I10), well controlled under current regimen.',
        plan: '1. Continue Lisinopril 10mg once daily in morning.\n2. Maintain low-sodium DASH dietary regimen.\n3. Schedule repeat lipid profile & BP recheck in 6 weeks.',
        doctorName: 'Dr. Yuki Tanaka',
        date: '2026-07-14',
        sessionTitle: 'Cardiology Review & Medication Titration',
        encounterId: 'ENC-00847261-02',
        patientName: 'Marcus Delgado',
        mrn: '#00847261'
      }
    },
    {
      id: 'sess-base-1',
      sessionNumber: 1,
      sessionTitle: 'Initial Hypertension Intake & Clinical Assessment',
      doctorName: 'Dr. Amara Osei',
      doctorId: 'DOC-003',
      doctorSpecialty: 'Internal Medicine Specialist',
      date: '2026-04-03',
      consultationMode: 'In-Person Consultation',
      status: 'COMPLETED',
      isShared: false,
      summary: 'Initial intake consultation for persistently elevated blood pressure readings (>150 mmHg). Conducted comprehensive cardiovascular evaluation, ordered resting ECG and basic metabolic panel. Initiated first-line ACE inhibitor Lisinopril 10mg.',
      assessment: 'Newly diagnosed Essential Hypertension (Moderate). ICD-10: I10.',
      plan: '1. Initiated Lisinopril 10mg daily.\n2. Lifestyle modification: DASH diet with sodium < 2g/day.\n3. Follow-up consultation in 3 months with home blood pressure logs.',
      subjective: 'Patient presented with elevated home blood pressure readings over the past 3 weeks. Reports occasional tension headaches and fatigue.',
      objective: 'BP: 155/96 mmHg, HR: 78 bpm, Weight: 83 kg, Temp: 36.8 °C. ECG: Normal sinus rhythm without ischemic changes.',
      vitals: {
        bp: '155/96 mmHg',
        hr: '78 bpm',
        weight: '83 kg',
        temp: '36.8 °C'
      },
      conversation: [
        { speaker: 'Doctor', role: 'doctor', text: 'Hello Marcus, I see your home BP readings have been consistently elevated. Have you had any chest tightness or shortness of breath?', time: '00:04' },
        { speaker: 'Patient', role: 'patient', text: 'No chest tightness, but I get occasional tension headaches in the morning.', time: '00:18' },
        { speaker: 'Doctor', role: 'doctor', text: 'Your clinic BP today is 155/96 mmHg. We will start you on a low dose of Lisinopril 10mg to protect your heart and kidneys, along with dietary adjustments.', time: '00:40' }
      ],
      transcript: 'Doctor: Hello Marcus, I see your home BP readings have been consistently elevated. Have you had any chest tightness or shortness of breath?\nPatient: No chest tightness, but I get occasional tension headaches in the morning.\nDoctor: Your clinic BP today is 155/96 mmHg. We will start you on a low dose of Lisinopril 10mg to protect your heart and kidneys, along with dietary adjustments.',
      soapReport: {
        subjective: 'Patient presented with elevated home blood pressure readings over the past 3 weeks. Reports occasional tension headaches and fatigue.',
        objective: 'BP: 155/96 mmHg, HR: 78 bpm, Weight: 83 kg, Temp: 36.8 °C. ECG: Normal sinus rhythm without ischemic changes.',
        assessment: 'Newly diagnosed Essential Hypertension (Moderate). ICD-10: I10.',
        plan: '1. Initiated Lisinopril 10mg daily.\n2. Lifestyle modification: DASH diet with sodium < 2g/day.\n3. Follow-up consultation in 3 months with home blood pressure logs.',
        doctorName: 'Dr. Amara Osei',
        date: '2026-04-03',
        sessionTitle: 'Initial Hypertension Intake & Clinical Assessment',
        encounterId: 'ENC-00847261-01',
        patientName: 'Marcus Delgado',
        mrn: '#00847261'
      }
    }
  ];

  lastConsultation: any = this.consultations[0];
  showTranscriptModal: boolean = false;
  selectedTranscriptSession: any = null;

  patientProfile: any = {
    name: 'Marcus Delgado',
    dob: '1984-03-12',
    mrn: '#00847261',
    age: 42,
    gender: 'M',
    phone: '+1 (555) 234-5678',
    email: '',
    reason: 'Hypertension review',
    condition: 'Essential Hypertension'
  };

  // Profile Edit Modal State
  showEditProfileModal: boolean = false;
  isSavingProfile: boolean = false;
  profileSaveMessage: string | null = null;
  profileSaveError: string | null = null;

  editForm = {
    name: '',
    age: 35,
    gender: 'M',
    dob: '1991-05-18',
    phone: '',
    email: '',
    reason: '',
    condition: ''
  };

  followUpAlerts: any[] = [
    {
      id: 1,
      title: 'Blood Pressure Check',
      doctor: 'With Dr. Yuki Tanaka',
      date: '2026-08-25',
      priority: 'High priority',
      priorityClass: 'high',
      dotColor: '#ef4444',
      daysAway: '12 days away'
    },
    {
      id: 2,
      title: 'Cholesterol Panel',
      doctor: 'With Dr. Ravi Menon',
      date: '2026-09-10',
      priority: 'Medium priority',
      priorityClass: 'medium',
      dotColor: '#f59e0b',
      daysAway: '28 days away'
    },
    {
      id: 3,
      title: 'Annual Check-up',
      doctor: 'With Dr. Ravi Menon',
      date: '2026-11-19',
      priority: 'Low priority',
      priorityClass: 'low',
      dotColor: '#0d9488',
      daysAway: '98 days away'
    }
  ];

  medicalRecords: any[] = [
    {
      id: 1,
      title: 'Hypertension — Stage 1',
      badge: 'Follow-up',
      doctorDate: 'Dr. Yuki Tanaka · 2026-07-14',
      notes: 'BP trending down. Continue current regimen. Sodium reduction showing results. Next check in 6 weeks.',
      vitals: {
        bp: '138/88 mmHg',
        hr: '72 bpm',
        weight: '81 kg',
        temp: '36.6 °C'
      }
    },
    {
      id: 2,
      title: 'Hypertension — Initial',
      badge: 'Consultation',
      doctorDate: 'Dr. Amara Osei · 2026-04-03',
      notes: 'Patient presented with persistently elevated blood pressure. Lifestyle modification advised. Initiated Lisinopril 10mg daily.',
      vitals: {
        bp: '155/96 mmHg',
        hr: '78 bpm',
        weight: '83 kg',
        temp: '36.8 °C'
      }
    }
  ];

  prescriptions: any[] = [
    {
      id: 'rx-1',
      title: 'Lisinopril — 10 mg',
      badge: 'active',
      statusClass: 'active',
      doctorDate: 'Dr. Yuki Tanaka · Issued 2026-04-03',
      instructions: 'Once daily — morning',
      refillInfo: '2 refills left',
      soapReport: null
    },
    {
      id: 'rx-2',
      title: 'Atorvastatin — 20 mg',
      badge: 'active',
      statusClass: 'active',
      doctorDate: 'Dr. Ravi Menon · Issued 2025-11-19',
      instructions: 'Once daily — evening',
      refillInfo: '5 refills left',
      soapReport: null
    },
    {
      id: 'rx-3',
      title: 'Aspirin — 81 mg',
      badge: 'expired',
      statusClass: 'expired',
      doctorDate: 'Dr. Ravi Menon · Issued 2025-11-19',
      instructions: 'Once daily',
      refillInfo: '0 refills left',
      soapReport: null
    }
  ];

  private listeners: (() => void)[] = [];

  ngOnInit(): void {
    this.loadPatientPortalSummary();

    // 1. Listen for real-time SOAP share event from parallel doctor consultation
    const handleSoapShared = (event: any) => {
      console.log('Received real-time SOAP shared notification:', event?.detail);
      this.loadPatientPortalSummary();
    };

    // 2. Listen for storage changes across browser tabs
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith('cliniq_shared_soap') || event.key === 'cliniq_patient_data_updated') {
        this.loadPatientPortalSummary();
      }
    };

    // 3. Listen for general patient data updates
    const handlePatientUpdate = () => {
      this.loadPatientPortalSummary();
    };

    window.addEventListener('cliniq_soap_shared', handleSoapShared);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('cliniq_patient_data_updated', handlePatientUpdate);

    this.listeners.push(() => window.removeEventListener('cliniq_soap_shared', handleSoapShared));
    this.listeners.push(() => window.removeEventListener('storage', handleStorage));
    this.listeners.push(() => window.removeEventListener('cliniq_patient_data_updated', handlePatientUpdate));
  }

  ngOnDestroy(): void {
    this.listeners.forEach(fn => fn());
    this.listeners = [];
  }

  async loadPatientPortalSummary(): Promise<void> {
    this.isLoading = true;
    const currentUser = this.authService.currentUser();
    const targetIdentifier = currentUser?.id || currentUser?.email || 'patient@cliniq.health';

    try {
      const summary = await this.appointmentService.getPatientPortalSummary(targetIdentifier);
      if (summary && summary.success) {
        if (summary.patientProfile) {
          this.patientProfile = {
            ...this.patientProfile,
            ...summary.patientProfile
          };
        }

        if (summary.followUpAlerts && summary.followUpAlerts.length > 0) {
          this.followUpAlerts = summary.followUpAlerts;
        }

        if (summary.medicalRecords && summary.medicalRecords.length > 0) {
          this.medicalRecords = summary.medicalRecords;
        }

        if (summary.prescriptions && summary.prescriptions.length > 0) {
          this.prescriptions = summary.prescriptions;
        }

        if (summary.consultations && summary.consultations.length > 0) {
          this.consultations = summary.consultations;
          this.lastConsultation = summary.lastConsultation || summary.consultations[0];
        }

        this.hasSharedSoap = !!summary.hasSharedSoap;

        // Find the latest shared SOAP report from prescriptions, records, or consultations
        const consultWithSoap = this.consultations.find(c => c.soapReport);
        const recordWithSoap = this.medicalRecords.find(r => r.soapReport);
        const rxWithSoap = this.prescriptions.find(p => p.soapReport);
        this.latestSharedSoap = consultWithSoap?.soapReport || recordWithSoap?.soapReport || rxWithSoap?.soapReport || null;
      }
    } catch (err) {
      console.warn('Could not load dynamic summary from backend, checking local storage:', err);
    } finally {
      // Check localStorage for offline/immediate sync fallback
      try {
        const localSharedRaw = localStorage.getItem('cliniq_last_shared_soap');
        if (localSharedRaw) {
          const localShared = JSON.parse(localSharedRaw);
          if (localShared?.soapReport) {
            this.hasSharedSoap = true;
            this.latestSharedSoap = {
              ...localShared.soapReport,
              doctorName: localShared.doctorName || 'Dr. Yuki Tanaka',
              date: new Date().toISOString().split('T')[0],
              patientName: this.patientProfile.name,
              mrn: this.patientProfile.mrn
            };
          }
        }
      } catch (e) {
        // ignore
      }
      this.isLoading = false;
    }
  }

  selectTab(tab: 'alerts' | 'records' | 'prescriptions' | 'consultations'): void {
    this.activeTab = tab;
  }

  openSoapModal(soapReport?: any): void {
    this.selectedSoapReport = soapReport || this.latestSharedSoap || (this.lastConsultation?.soapReport) || {
      subjective: 'Patient Marcus Delgado presented for consultation.',
      objective: 'BP: 145/92 mmHg, HR: 78 bpm.',
      assessment: '1. Essential Hypertension Stage 1.',
      plan: '1. Continue Lisinopril 10mg. 2. Follow-up in 4 weeks.',
      doctorName: this.lastConsultation?.doctorName || 'Dr. Yuki Tanaka',
      date: this.lastConsultation?.date || '2026-08-13',
      patientName: this.patientProfile.name,
      mrn: this.patientProfile.mrn
    };
    this.showSoapModal = true;
  }

  closeSoapModal(): void {
    this.showSoapModal = false;
    this.selectedSoapReport = null;
  }

  openTranscriptModal(session: any): void {
    this.selectedTranscriptSession = session || this.lastConsultation;
    this.showTranscriptModal = true;
  }

  closeTranscriptModal(): void {
    this.showTranscriptModal = false;
    this.selectedTranscriptSession = null;
  }

  printSoapReport(): void {
    window.print();
  }

  openEditProfileModal(): void {
    this.profileSaveMessage = null;
    this.profileSaveError = null;
    const currentUser = this.authService.currentUser();
    this.editForm = {
      name: this.patientProfile.name || currentUser?.name || '',
      age: this.patientProfile.age || 35,
      gender: this.patientProfile.gender || 'M',
      dob: this.patientProfile.dob || '1991-05-18',
      phone: this.patientProfile.phone || currentUser?.phone_number || '',
      email: this.patientProfile.email || currentUser?.email || '',
      reason: this.patientProfile.reason || 'General Health Consultation',
      condition: this.patientProfile.condition || 'Triage Review'
    };
    this.showEditProfileModal = true;
  }

  closeEditProfileModal(): void {
    this.showEditProfileModal = false;
    this.profileSaveMessage = null;
    this.profileSaveError = null;
  }

  async saveProfileChanges(): Promise<void> {
    if (!this.editForm.name.trim()) {
      this.profileSaveError = 'Please enter your full name.';
      return;
    }

    this.isSavingProfile = true;
    this.profileSaveMessage = null;
    this.profileSaveError = null;

    const targetId = this.patientProfile.mrn || this.patientProfile.email || this.authService.currentUser()?.id || '#00847261';

    try {
      // 1. Update in PostgreSQL database (PatientModel)
      await this.appointmentService.updatePatient(targetId, {
        name: this.editForm.name.trim(),
        age: Number(this.editForm.age) || 35,
        gender: this.editForm.gender as any,
        phone: this.editForm.phone.trim(),
        email: this.editForm.email.trim(),
        reason: this.editForm.reason.trim(),
        condition: this.editForm.condition.trim()
      });

      // 2. Update User account record via AuthService
      await this.authService.updateProfile({
        full_name: this.editForm.name.trim(),
        phone_number: this.editForm.phone.trim()
      });

      // 3. Update component state immediately
      this.patientProfile = {
        ...this.patientProfile,
        name: this.editForm.name.trim(),
        age: Number(this.editForm.age) || 35,
        gender: this.editForm.gender,
        dob: this.editForm.dob,
        phone: this.editForm.phone.trim(),
        email: this.editForm.email.trim(),
        reason: this.editForm.reason.trim(),
        condition: this.editForm.condition.trim()
      };

      // Broadcast update event to active tabs
      window.dispatchEvent(new CustomEvent('cliniq_patient_data_updated', { detail: this.patientProfile }));

      this.isSavingProfile = false;
      this.profileSaveMessage = '✓ Profile details saved and updated in PostgreSQL database successfully!';

      setTimeout(() => {
        this.closeEditProfileModal();
      }, 1200);
    } catch (err: any) {
      this.isSavingProfile = false;
      console.error('Error saving patient profile:', err);
      this.profileSaveError = 'Failed to update profile. Please try again.';
    }
  }
}
