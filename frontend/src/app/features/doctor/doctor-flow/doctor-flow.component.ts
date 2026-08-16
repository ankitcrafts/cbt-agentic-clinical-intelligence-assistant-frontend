import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorLoginComponent } from '../doctor-login/doctor-login.component';
import { DoctorDashboardComponent } from '../doctor-dashboard/doctor-dashboard.component';

@Component({
  selector: 'app-doctor-flow',
  standalone: true,
  imports: [
    CommonModule,
    DoctorLoginComponent,
    DoctorDashboardComponent
  ],
  templateUrl: './doctor-flow.component.html',
  styleUrls: ['./doctor-flow.component.scss']
})
export class DoctorFlowComponent {
  authService = inject(AuthService);
}
