import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.scss']
})
export class PatientDashboardComponent {
  authService = inject(AuthService);

  activeTab: 'alerts' | 'records' | 'prescriptions' = 'alerts';

  patientProfile = {
    name: 'Marcus Delgado',
    dob: '1984-03-12',
    mrn: '#00847261'
  };

  followUpAlerts = [
    {
      id: 1,
      title: 'Blood Pressure Check',
      doctor: 'With Dr. Amara Osei',
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

  medicalRecords = [
    {
      id: 1,
      title: 'Hypertension — Stage 1',
      badge: 'Follow-up',
      doctorDate: 'Dr. Amara Osei · 2026-07-14',
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
    },
    {
      id: 3,
      title: 'Routine — No acute findings',
      badge: 'Annual Check',
      doctorDate: 'Dr. Ravi Menon · 2025-11-19',
      notes: 'Cholesterol slightly elevated. Dietary changes recommended. All other markers within normal range.',
      vitals: {
        bp: '128/82 mmHg',
        hr: '68 bpm',
        weight: '82 kg',
        temp: '36.5 °C'
      }
    }
  ];

  prescriptions = [
    {
      id: 1,
      title: 'Lisinopril — 10 mg',
      badge: 'active',
      statusClass: 'active',
      doctorDate: 'Dr. Amara Osei · Issued 2026-04-03',
      instructions: 'Once daily — morning',
      refillInfo: '2 refills left'
    },
    {
      id: 2,
      title: 'Atorvastatin — 20 mg',
      badge: 'active',
      statusClass: 'active',
      doctorDate: 'Dr. Ravi Menon · Issued 2025-11-19',
      instructions: 'Once daily — evening',
      refillInfo: '5 refills left'
    },
    {
      id: 3,
      title: 'Aspirin — 81 mg',
      badge: 'expired',
      statusClass: 'expired',
      doctorDate: 'Dr. Ravi Menon · Issued 2025-11-19',
      instructions: 'Once daily',
      refillInfo: '0 refills left'
    }
  ];

  selectTab(tab: 'alerts' | 'records' | 'prescriptions') {
    this.activeTab = tab;
  }
}
