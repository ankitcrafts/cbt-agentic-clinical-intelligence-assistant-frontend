import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { AdminLoginComponent } from '../admin-login/admin-login.component';
import { AdminDashboardComponent } from '../admin-dashboard/admin-dashboard.component';
import { DoctorsManagementComponent } from '../doctors-management/doctors-management.component';
import { PatientsManagementComponent } from '../patients-management/patients-management.component';
import { RecordingsReportsComponent } from '../recordings-reports/recordings-reports.component';

@Component({
  selector: 'app-admin-flow',
  standalone: true,
  imports: [
    CommonModule,
    AdminLoginComponent,
    AdminDashboardComponent,
    DoctorsManagementComponent,
    PatientsManagementComponent,
    RecordingsReportsComponent
  ],
  templateUrl: './admin-flow.component.html',
  styleUrls: ['./admin-flow.component.scss']
})
export class AdminFlowComponent {
  authService = inject(AuthService);
}
