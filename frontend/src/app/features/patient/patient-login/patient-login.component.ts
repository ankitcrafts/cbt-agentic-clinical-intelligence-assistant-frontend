import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/platform.model';

@Component({
  selector: 'app-patient-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-login.component.html',
  styleUrls: ['./patient-login.component.scss']
})
export class PatientLoginComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);

  email = 'patient@cliniq.health';
  otpCode = '';
  countdown = 0;
  private timerInterval: any = null;

  // Step 3: New User Onboarding Profile Form State
  signupFullName = '';
  signupPhone = '';

  ngOnInit() {
    this.syncRoleEmail(this.authService.currentRole());
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  selectRole(role: UserRole) {
    this.authService.setRole(role);
    this.syncRoleEmail(role);
    this.otpCode = '';
    this.clearTimer();
  }

  private syncRoleEmail(role: UserRole) {
    if (role === 'ADMIN') this.email = 'admin@cliniq.health';
    else if (role === 'DOCTOR') this.email = 'doctor@cliniq.health';
    else this.email = 'patient@cliniq.health';
  }

  async onSendOtp() {
    if (!this.email) return;
    this.otpCode = '';
    const res = await this.authService.sendOtp(this.email, this.authService.currentRole());
    if (res && res.success) {
      this.startResendTimer();
      this.otpCode = '';
    }
  }

  async onVerifyOtp() {
    if (!this.otpCode || this.otpCode.length < 4) return;
    const result = await this.authService.verifyOtp(this.email, this.otpCode, this.authService.currentRole());
    if (result.success && (result.isNewUser || !result.isProfileCompleted)) {
      this.signupFullName = '';
    }
  }

  async onCompleteSignupProfile() {
    if (!this.signupFullName.trim()) {
      this.authService.errorMessage.set('Please enter your full name to complete profile setup.');
      return;
    }
    this.authService.errorMessage.set(null);
    await this.authService.updateProfile({
      full_name: this.signupFullName.trim(),
      phone_number: this.signupPhone.trim()
    });
  }

  onSkipSignupProfile() {
    this.authService.isNewUserPendingProfile.set(false);
  }

  onResendOtp() {
    if (this.countdown > 0) return;
    this.onSendOtp();
  }

  onChangeEmail() {
    this.authService.otpSent.set(false);
    this.authService.errorMessage.set(null);
    this.otpCode = '';
    this.clearTimer();
  }

  onQuickDemoLogin() {
    this.authService.quickDemoLogin(this.authService.currentRole());
  }

  private startResendTimer() {
    this.clearTimer();
    this.countdown = 60;
    this.timerInterval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        this.clearTimer();
      }
    }, 1000);
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
