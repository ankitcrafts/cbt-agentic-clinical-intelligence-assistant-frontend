import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-patient-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-login.component.html',
  styleUrls: ['./patient-login.component.scss']
})
export class PatientLoginComponent {
  authService = inject(AuthService);

  isLoginMode = true;
  fullName = 'Priya Verma';
  email = 'patient@email.com';
  password = '••••••••••••';
  patientId = 'P-90823';

  onLogin() {
    if (!this.isLoginMode) {
      this.authService.currentUser.set({
        name: this.fullName || 'Priya Verma',
        email: this.email,
        designation: `Patient (ID: ${this.patientId || 'P-90823'})`
      });
    }
    this.authService.login();
  }
}
