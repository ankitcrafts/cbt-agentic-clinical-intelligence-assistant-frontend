import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UserRole, UserProfile, SendOTPResponse, AuthResponse } from '../models/platform.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private authApiUrl = (environment as any).authApiUrl || 'http://localhost:8000/api/auth';

  currentRole = signal<UserRole>('DOCTOR');
  currentStep = signal<number>(1);
  isLoggedIn = signal<boolean>(false);
  isDarkMode = signal<boolean>(false);
  
  // User profile
  currentUser = signal<{
    id?: string;
    name: string;
    email: string;
    designation: string;
    role?: UserRole;
    department?: string;
    specialization?: string;
    phone_number?: string;
    avatar_initials?: string;
    is_profile_completed?: boolean;
  }>({
    id: 'DOC-8492',
    name: 'Dr. Yuki Tanaka',
    email: 'doctor@cliniq.health',
    designation: 'Senior Cardiologist (Cardiology)',
    department: 'Cardiology',
    specialization: 'Senior Cardiologist',
    role: 'DOCTOR',
    is_profile_completed: true
  });

  // Auth operation state
  accessToken = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  devOtp = signal<string | null>(null);
  otpSent = signal<boolean>(false);
  isNewUserPendingProfile = signal<boolean>(false);
  showProfileModal = signal<boolean>(false);

  constructor() {
    this.applyTheme(this.isDarkMode());
    this.restoreSession();
  }

  toggleTheme() {
    const nextTheme = !this.isDarkMode();
    this.isDarkMode.set(nextTheme);
    this.applyTheme(nextTheme);
  }

  private applyTheme(isDark: boolean) {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }

  openProfileModal() {
    this.showProfileModal.set(true);
  }

  closeProfileModal() {
    this.showProfileModal.set(false);
  }

  setRole(role: UserRole) {
    this.currentRole.set(role);
    this.currentStep.set(1);
    this.isLoggedIn.set(false);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.otpSent.set(false);
    this.devOtp.set(null);
    this.isNewUserPendingProfile.set(false);

    if (role === 'ADMIN') {
      this.currentUser.set({
        id: 'ADM-0102',
        name: 'Hospital Administrator',
        email: 'admin@cliniq.health',
        designation: 'System Administrator',
        department: 'Hospital Operations',
        role: 'ADMIN',
        is_profile_completed: true
      });
    } else if (role === 'DOCTOR') {
      this.currentUser.set({
        id: 'DOC-8492',
        name: 'Dr. Yuki Tanaka',
        email: 'doctor@cliniq.health',
        designation: 'Senior Cardiologist (Cardiology)',
        department: 'Cardiology',
        specialization: 'Senior Cardiologist',
        role: 'DOCTOR',
        is_profile_completed: true
      });
    } else {
      this.currentUser.set({
        id: 'PAT-1245',
        name: 'Marcus Delgado',
        email: 'patient@cliniq.health',
        designation: 'Patient (ID: PAT-1245)',
        role: 'PATIENT',
        is_profile_completed: true
      });
    }
  }

  async sendOtp(email: string, role: UserRole): Promise<SendOTPResponse | null> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.devOtp.set(null);
    this.isNewUserPendingProfile.set(false);

    const cleanEmail = email.trim().toLowerCase();

    // Frontend strict RBAC guard for demo accounts
    if (cleanEmail === 'admin@cliniq.health' && role !== 'ADMIN') {
      this.errorMessage.set(`⛔ Access Denied: 'admin@cliniq.health' is registered as an Administrator and cannot access the ${role} portal.`);
      this.isLoading.set(false);
      return null;
    }
    if (cleanEmail === 'doctor@cliniq.health' && role !== 'DOCTOR') {
      this.errorMessage.set(`⛔ Access Denied: 'doctor@cliniq.health' is registered as a Doctor and cannot access the ${role} portal.`);
      this.isLoading.set(false);
      return null;
    }
    if (cleanEmail === 'patient@cliniq.health' && role !== 'PATIENT') {
      this.errorMessage.set(`⛔ Access Denied: 'patient@cliniq.health' is registered as a Patient and cannot access the ${role} portal.`);
      this.isLoading.set(false);
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<SendOTPResponse>(`${this.authApiUrl}/send-otp`, {
          email: cleanEmail,
          role,
          purpose: 'SIGNIN'
        })
      );
      this.otpSent.set(true);
      if (response.dev_otp) {
        this.devOtp.set(response.dev_otp);
      }
      this.successMessage.set(`A 6-digit verification code has been sent to ${cleanEmail}`);
      return response;
    } catch (err: any) {
      console.warn('Backend send-otp error:', err);
      const detail = err.error?.detail || err.message;
      // If backend explicitly rejected due to RBAC or Forbidden, do NOT fallback
      if (err.status === 403 || (detail && (detail.includes('Access Denied') || detail.includes('Security Alert')))) {
        this.errorMessage.set(`⛔ ${detail}`);
        return null;
      }
      
      // Fallback for offline demo mode
      const fakeOtp = '123456';
      this.otpSent.set(true);
      this.devOtp.set(fakeOtp);
      this.successMessage.set(`(Demo) Verification code generated: ${fakeOtp}`);
      return {
        success: true,
        message: 'OTP sent',
        email: cleanEmail,
        role,
        expires_in_seconds: 600,
        dev_otp: fakeOtp
      };
    } finally {
      this.isLoading.set(false);
    }
  }

  async verifyOtp(email: string, otpCode: string, role: UserRole): Promise<{ success: boolean; isNewUser?: boolean; isProfileCompleted?: boolean }> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.authApiUrl}/verify-otp`, {
          email: cleanEmail,
          otp_code: otpCode.trim(),
          role
        })
      );

      if (response && response.access_token) {
        this.accessToken.set(response.access_token);
        const user = response.user;
        const mappedRole = (user.role as UserRole) || role;

        // Security check: ensure received token matches active role
        if (mappedRole !== role) {
          this.errorMessage.set(`⛔ Access Denied: User is authorized for ${mappedRole}, not ${role}.`);
          return { success: false };
        }

        const isProfileDone = !!(user.full_name && user.full_name.trim());
        const displayLabel = user.full_name || (
          mappedRole === 'DOCTOR' ? `Doctor (${user.id})` :
          mappedRole === 'PATIENT' ? `Patient (${user.id})` :
          `Administrator (${user.id})`
        );
        
        const designation = user.designation || (
          mappedRole === 'ADMIN' ? 'System Administrator' :
          mappedRole === 'DOCTOR' ? `${user.specialization || 'Attending Physician'} (${user.department || 'Cardiology'})` :
          `Patient (ID: ${user.id})`
        );

        this.currentUser.set({
          id: user.id,
          name: displayLabel,
          email: user.email,
          role: mappedRole,
          designation: designation,
          department: user.department || (mappedRole === 'DOCTOR' ? 'General Medicine' : undefined),
          specialization: user.specialization,
          phone_number: user.phone_number,
          avatar_initials: user.avatar_initials || (displayLabel.slice(0, 2).toUpperCase()),
          is_profile_completed: isProfileDone
        });

        this.currentRole.set(mappedRole);
        this.isLoggedIn.set(true);
        this.currentStep.set(1);

        // If it's a new user without a completed profile name, flag it
        if (!isProfileDone) {
          this.isNewUserPendingProfile.set(true);
        }

        // Save session in local storage
        this.saveSession({
          token: response.access_token,
          user: this.currentUser(),
          role: mappedRole
        });
        return { success: true, isNewUser: response.is_new_user, isProfileCompleted: isProfileDone };
      }
      return { success: false };
    } catch (err: any) {
      console.warn('Backend verify-otp error:', err);
      const detail = err.error?.detail || err.message;
      if (err.status === 403 || (detail && detail.includes('Access Denied'))) {
        this.errorMessage.set(`⛔ ${detail}`);
        return { success: false };
      }

      // Fallback for offline demo mode if 123456 or devOtp
      if (otpCode.trim() === '123456' || (this.devOtp() && otpCode.trim() === this.devOtp())) {
        this.loginWithProfile(cleanEmail, role);
        return { success: true, isNewUser: false, isProfileCompleted: true };
      }
      const msg = detail || 'Invalid or expired verification code. Please try again.';
      this.errorMessage.set(msg);
      return { success: false };
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateProfile(data: {
    full_name?: string;
    department?: string;
    specialization?: string;
    designation?: string;
    phone_number?: string;
  }): Promise<boolean> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      let headers = new HttpHeaders();
      const token = this.accessToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }

      const updatedUser = await firstValueFrom(
        this.http.put<UserProfile>(`${this.authApiUrl}/profile`, data, { headers })
      );

      if (updatedUser) {
        const mappedRole = (updatedUser.role as UserRole) || this.currentRole();
        const designation = updatedUser.designation || (
          mappedRole === 'ADMIN' ? 'System Administrator' :
          mappedRole === 'DOCTOR' ? `${updatedUser.specialization || 'Attending Physician'} (${updatedUser.department || 'Cardiology'})` :
          `Patient (ID: ${updatedUser.id})`
        );

        this.currentUser.set({
          id: updatedUser.id || this.currentUser().id,
          name: updatedUser.full_name || updatedUser.name || this.currentUser().name,
          email: updatedUser.email || this.currentUser().email,
          role: mappedRole,
          designation,
          department: updatedUser.department,
          specialization: updatedUser.specialization,
          phone_number: updatedUser.phone_number,
          avatar_initials: updatedUser.avatar_initials,
          is_profile_completed: !!(updatedUser.full_name && updatedUser.full_name.trim())
        });

        this.isNewUserPendingProfile.set(false);

        this.saveSession({
          token: this.accessToken(),
          user: this.currentUser(),
          role: mappedRole
        });
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('Update profile API error, updating locally:', err);
      if (data.full_name) {
        const cur = this.currentUser();
        this.currentUser.set({
          ...cur,
          name: data.full_name,
          department: data.department || cur.department,
          specialization: data.specialization || cur.specialization,
          phone_number: data.phone_number || cur.phone_number,
          is_profile_completed: true
        });
        this.isNewUserPendingProfile.set(false);
        this.saveSession({
          token: this.accessToken(),
          user: this.currentUser(),
          role: this.currentRole()
        });
        return true;
      }
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  loginWithProfile(email: string, role: UserRole) {
    const name = role === 'ADMIN' ? 'Hospital Administrator' : (role === 'DOCTOR' ? 'Dr. Yuki Tanaka' : 'Marcus Delgado');
    const designation = role === 'ADMIN' ? 'System Administrator' : (role === 'DOCTOR' ? 'Senior Cardiologist (Cardiology)' : 'Patient (ID: P-90823)');
    
    this.currentUser.set({
      name,
      email,
      role,
      designation
    });
    this.currentRole.set(role);
    this.isLoggedIn.set(true);
    this.currentStep.set(1);
    this.saveSession({
      token: 'cliniq_demo_jwt_token_' + Date.now(),
      user: this.currentUser(),
      role
    });
  }

  quickDemoLogin(role?: UserRole) {
    const targetRole = role || this.currentRole();
    const defaultEmail = targetRole === 'ADMIN' ? 'admin@cliniq.health' : (targetRole === 'DOCTOR' ? 'doctor@cliniq.health' : 'patient@cliniq.health');
    this.loginWithProfile(defaultEmail, targetRole);
  }

  login() {
    this.isLoggedIn.set(true);
    this.currentStep.set(1);
  }

  logout() {
    this.isLoggedIn.set(false);
    this.accessToken.set(null);
    this.otpSent.set(false);
    this.devOtp.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.currentStep.set(1);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('cliniq_session');
    }
  }

  setStep(step: number) {
    this.currentStep.set(step);
  }

  private saveSession(session: any) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('cliniq_session', JSON.stringify(session));
      } catch (e) {
        console.error('Failed to save session:', e);
      }
    }
  }

  private restoreSession() {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('cliniq_session');
        if (saved) {
          const session = JSON.parse(saved);
          if (session.user && session.role) {
            this.currentUser.set(session.user);
            this.currentRole.set(session.role);
            this.accessToken.set(session.token || null);
            this.isLoggedIn.set(true);
          }
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      }
    }
  }
}
