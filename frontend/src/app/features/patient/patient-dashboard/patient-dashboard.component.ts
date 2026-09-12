import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.scss']
})
export class PatientDashboardComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  appointmentService = inject(AppointmentService);

  activeTab: 'alerts' | 'records' | 'prescriptions' = 'alerts';
  isLoading: boolean = false;
  hasSharedSoap: boolean = false;
  latestSharedSoap: any = null;
  showSoapModal: boolean = false;
  selectedSoapReport: any = null;

  patientProfile = {
    name: 'Marcus Delgado',
    dob: '1984-03-12',
    mrn: '#00847261',
    age: 42,
    gender: 'M',
    phone: '+1 (555) 234-5678',
    condition: 'Essential Hypertension'
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

        this.hasSharedSoap = !!summary.hasSharedSoap;

        // Find the latest shared SOAP report from prescriptions or records
        const recordWithSoap = this.medicalRecords.find(r => r.soapReport);
        const rxWithSoap = this.prescriptions.find(p => p.soapReport);
        this.latestSharedSoap = recordWithSoap?.soapReport || rxWithSoap?.soapReport || null;
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

  selectTab(tab: 'alerts' | 'records' | 'prescriptions'): void {
    this.activeTab = tab;
  }

  openSoapModal(soapReport?: any): void {
    this.selectedSoapReport = soapReport || this.latestSharedSoap || {
      subjective: 'Patient Marcus Delgado presented for consultation.',
      objective: 'BP: 145/92 mmHg, HR: 78 bpm.',
      assessment: '1. Essential Hypertension Stage 1.',
      plan: '1. Continue Lisinopril 10mg. 2. Follow-up in 4 weeks.',
      doctorName: 'Dr. Yuki Tanaka',
      date: '2026-08-13',
      patientName: this.patientProfile.name,
      mrn: this.patientProfile.mrn
    };
    this.showSoapModal = true;
  }

  closeSoapModal(): void {
    this.showSoapModal = false;
    this.selectedSoapReport = null;
  }

  printSoapReport(): void {
    window.print();
  }
}
