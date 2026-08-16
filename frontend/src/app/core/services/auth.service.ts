import { Injectable, signal } from '@angular/core';
import { UserRole } from '../models/platform.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentRole = signal<UserRole>('DOCTOR');
  currentStep = signal<number>(1);
  isLoggedIn = signal<boolean>(true);
  isDarkMode = signal<boolean>(false);
  currentUser = signal<{ name: string; email: string; designation: string }>({
    name: 'Dr. Rahul Sharma',
    email: 'doctor@hospital.com',
    designation: 'Senior Cardiologist'
  });

  constructor() {
    this.applyTheme(this.isDarkMode());
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

  setRole(role: UserRole) {
    this.currentRole.set(role);
    this.currentStep.set(1);
    this.isLoggedIn.set(false); // require login when switching role in demo

    if (role === 'ADMIN') {
      this.currentUser.set({
        name: 'Ankit Sharma',
        email: 'admin@cliniq.health',
        designation: 'System Administrator'
      });
    } else if (role === 'DOCTOR') {
      this.currentUser.set({
        name: 'Dr. Rahul Sharma',
        email: 'doctor@cliniq.health',
        designation: 'Senior Cardiologist'
      });
    } else {
      this.currentUser.set({
        name: 'Priya Verma',
        email: 'patient@cliniq.health',
        designation: 'Patient (ID: P-90823)'
      });
    }
  }

  login() {
    this.isLoggedIn.set(true);
    this.currentStep.set(1); // Goes to dashboard (Step 1)
  }

  logout() {
    this.isLoggedIn.set(false);
    this.currentStep.set(1);
  }

  setStep(step: number) {
    this.currentStep.set(step);
  }
}
