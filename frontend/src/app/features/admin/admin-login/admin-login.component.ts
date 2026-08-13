import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss']
})
export class AdminLoginComponent {
  authService = inject(AuthService);

  isLoginMode = true;
  fullName = 'Ankit Sharma';
  email = 'admin@hospital.com';
  password = '••••••••••••';

  onLogin() {
    if (!this.isLoginMode) {
      this.authService.currentUser.set({
        name: this.fullName || 'Ankit Sharma',
        email: this.email,
        designation: 'System Administrator'
      });
    }
    this.authService.login();
  }
}
