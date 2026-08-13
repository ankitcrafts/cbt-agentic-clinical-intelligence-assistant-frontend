import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorLoginComponent } from '../doctor-login/doctor-login.component';
import { DoctorDashboardComponent } from '../doctor-dashboard/doctor-dashboard.component';
import { ConsultationRecordingComponent } from '../consultation-recording/consultation-recording.component';
import { ProcessingTranscriptComponent } from '../processing-transcript/processing-transcript.component';
import { TranscriptReadyComponent } from '../transcript-ready/transcript-ready.component';
import { SoapPrescriptionComponent } from '../soap-prescription/soap-prescription.component';

@Component({
  selector: 'app-doctor-flow',
  standalone: true,
  imports: [
    CommonModule,
    DoctorLoginComponent,
    DoctorDashboardComponent,
    ConsultationRecordingComponent,
    ProcessingTranscriptComponent,
    TranscriptReadyComponent,
    SoapPrescriptionComponent
  ],
  templateUrl: './doctor-flow.component.html',
  styleUrls: ['./doctor-flow.component.scss']
})
export class DoctorFlowComponent {
  authService = inject(AuthService);
}
