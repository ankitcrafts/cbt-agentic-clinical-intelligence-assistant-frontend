import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { PatientLoginComponent } from '../patient-login/patient-login.component';
import { PatientDashboardComponent } from '../patient-dashboard/patient-dashboard.component';
import { ConsultationDetailsComponent } from '../consultation-details/consultation-details.component';
import { ViewTranscriptComponent } from '../view-transcript/view-transcript.component';
import { ViewSoapReportComponent } from '../view-soap-report/view-soap-report.component';
import { ViewPrescriptionComponent } from '../view-prescription/view-prescription.component';

@Component({
  selector: 'app-patient-flow',
  standalone: true,
  imports: [
    CommonModule,
    PatientLoginComponent,
    PatientDashboardComponent,
    ConsultationDetailsComponent,
    ViewTranscriptComponent,
    ViewSoapReportComponent,
    ViewPrescriptionComponent
  ],
  templateUrl: './patient-flow.component.html',
  styleUrls: ['./patient-flow.component.scss']
})
export class PatientFlowComponent {
  authService = inject(AuthService);
}
