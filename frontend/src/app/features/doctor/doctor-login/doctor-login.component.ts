import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/platform.model';

@Component({
  selector: 'app-doctor-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-login.component.html',
  styleUrls: ['./doctor-login.component.scss']
})
export class DoctorLoginComponent {
  authService = inject(AuthService);

  email = 'doctor@cliniq.health';
  password = '••••••••••••';

  selectRole(role: UserRole) {
    this.authService.setRole(role);
    if (role === 'ADMIN') this.email = 'admin@cliniq.health';
    else if (role === 'DOCTOR') this.email = 'doctor@cliniq.health';
    else this.email = 'patient@cliniq.health';
  }

  onLogin() {
    this.authService.login();
  }
}
