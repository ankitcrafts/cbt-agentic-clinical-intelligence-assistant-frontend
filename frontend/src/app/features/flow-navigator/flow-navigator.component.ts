import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/platform.model';

@Component({
  selector: 'app-flow-navigator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flow-navigator.component.html',
  styleUrls: ['./flow-navigator.component.scss']
})
export class FlowNavigatorComponent {
  authService = inject(AuthService);

  roles: { id: UserRole; title: string; color: string; steps: string[] }[] = [
    {
      id: 'ADMIN',
      title: 'Administrator',
      color: '#059669',
      steps: ['Sign In / Signup', 'System Dashboard', 'Doctors Directory', 'Patients Directory', 'Recordings & Reports']
    },
    {
      id: 'DOCTOR',
      title: 'Doctor (Clinician)',
      color: '#0284c7',
      steps: ['Sign In / Signup', 'Clinical Dashboard', 'Consultation Recording', 'AI Processing', 'Transcript Review', 'SOAP & Prescription']
    },
    {
      id: 'PATIENT',
      title: 'Patient',
      color: '#7c3aed',
      steps: ['Sign In / Signup', 'Health Dashboard', 'Consultation Details', 'Medical Transcript', 'SOAP Report', 'Prescriptions']
    }
  ];

  selectRole(role: UserRole) {
    this.authService.setRole(role);
  }

  selectStep(stepIndex: number) {
    this.authService.setStep(stepIndex);
  }
}
