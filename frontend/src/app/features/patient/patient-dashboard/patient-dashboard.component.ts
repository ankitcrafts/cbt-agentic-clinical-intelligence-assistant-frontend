import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../core/services/mock-data.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.scss']
})
export class PatientDashboardComponent {
  mockData = inject(MockDataService);
  authService = inject(AuthService);

  recentConsultations = [
    { date: '09 May 2026', doctor: 'Dr. Rahul Sharma', type: 'Consultation', status: 'Completed' },
    { date: '02 May 2026', doctor: 'Dr. Rahul Sharma', type: 'Follow-up', status: 'Completed' },
    { date: '25 Apr 2026', doctor: 'Dr. Rahul Sharma', type: 'Consultation', status: 'Completed' }
  ];

  viewConsultationDetails() {
    this.authService.setStep(2); // View Consultation Details (Step 2)
  }
}
