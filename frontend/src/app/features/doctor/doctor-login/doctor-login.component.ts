import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-doctor-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-login.component.html',
  styleUrls: ['./doctor-login.component.scss']
})
export class DoctorLoginComponent {
  authService = inject(AuthService);

  isLoginMode = true;
  fullName = 'Dr. Rahul Sharma';
  email = 'doctor@hospital.com';
  password = '••••••••••••';
  designation = 'Senior Cardiologist';

  onLogin() {
    if (!this.isLoginMode) {
      this.authService.currentUser.set({
        name: this.fullName || 'Dr. Rahul Sharma',
        email: this.email,
        designation: this.designation || 'Senior Cardiologist'
      });
    }
    this.authService.login();
  }
}
