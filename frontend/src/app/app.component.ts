import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './shared/components/header/header.component';
import { KeyFeaturesBarComponent } from './shared/components/key-features-bar/key-features-bar.component';
import { AdminFlowComponent } from './features/admin/admin-flow/admin-flow.component';
import { DoctorFlowComponent } from './features/doctor/doctor-flow/doctor-flow.component';
import { PatientFlowComponent } from './features/patient/patient-flow/patient-flow.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    KeyFeaturesBarComponent,
    AdminFlowComponent,
    DoctorFlowComponent,
    PatientFlowComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  authService = inject(AuthService);
}
