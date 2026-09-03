import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  authService = inject(AuthService);

  // Edit Profile Form State
  editFullName = '';
  editDepartment = '';
  editSpecialization = '';
  editPhoneNumber = '';
  saveSuccessMessage: string | null = null;
  saveErrorMessage: string | null = null;

  get roleBadgeText(): string {
    const role = this.authService.currentRole();
    const user = this.authService.currentUser();
    if (role === 'ADMIN') return `${user?.name || 'Administrator'} (Hospital Operations)`;
    if (role === 'DOCTOR') return user?.name || 'Dr. Yuki Tanaka';
    return `${user?.name || 'Patient Portal'}`;
  }

  openProfileEdit() {
    const u = this.authService.currentUser();
    this.editFullName = u.name.startsWith('Doctor (') || u.name.startsWith('Patient (') || u.name.startsWith('Administrator (')
      ? ''
      : u.name;
    this.editDepartment = u.department || (this.authService.currentRole() === 'DOCTOR' ? 'Cardiology' : '');
    this.editSpecialization = u.specialization || (this.authService.currentRole() === 'DOCTOR' ? 'Senior Cardiologist' : '');
    this.editPhoneNumber = u.phone_number || '';
    this.saveSuccessMessage = null;
    this.saveErrorMessage = null;
    this.authService.openProfileModal();
  }

  closeProfileModal() {
    this.authService.closeProfileModal();
  }

  async onSaveProfile() {
    if (!this.editFullName.trim()) {
      this.saveErrorMessage = 'Please enter your full name.';
      return;
    }
    this.saveErrorMessage = null;
    this.saveSuccessMessage = null;

    const success = await this.authService.updateProfile({
      full_name: this.editFullName.trim(),
      department: this.editDepartment.trim(),
      specialization: this.editSpecialization.trim(),
      phone_number: this.editPhoneNumber.trim()
    });

    if (success) {
      this.saveSuccessMessage = 'Profile updated successfully!';
      setTimeout(() => {
        this.closeProfileModal();
      }, 1200);
    } else {
      this.saveErrorMessage = 'Failed to update profile. Please try again.';
    }
  }
}
