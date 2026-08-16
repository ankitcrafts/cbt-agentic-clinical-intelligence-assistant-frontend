import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { PatientLoginComponent } from '../patient-login/patient-login.component';
import { PatientDashboardComponent } from '../patient-dashboard/patient-dashboard.component';

@Component({
  selector: 'app-patient-flow',
  standalone: true,
  imports: [
    CommonModule,
    PatientLoginComponent,
    PatientDashboardComponent
  ],
  templateUrl: './patient-flow.component.html',
  styleUrls: ['./patient-flow.component.scss']
})
export class PatientFlowComponent {
  authService = inject(AuthService);
}
