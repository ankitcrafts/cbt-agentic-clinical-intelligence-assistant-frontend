import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService, DoctorProfile } from '../../../core/services/appointment.service';

@Component({
  selector: 'app-doctors-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctors-management.component.html',
  styleUrls: ['./doctors-management.component.scss']
})
export class DoctorsManagementComponent {
  appointmentService = inject(AppointmentService);
  searchTerm = '';

  showAddModal = false;
  newDoctor = { name: '', specialty: '', department: 'Cardiology', email: '' };

  get doctorsList(): DoctorProfile[] {
    return this.appointmentService.doctors();
  }

  get filteredDoctors(): DoctorProfile[] {
    return this.doctorsList.filter(doc => 
      doc.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      doc.department.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      doc.email.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  getAvailableSlots(doc: DoctorProfile): number {
    return doc.slots.filter(s => s.status === 'AVAILABLE').length;
  }

  toggleAddModal(): void {
    this.showAddModal = !this.showAddModal;
  }

  addDoctor(): void {
    if (this.newDoctor.name && this.newDoctor.specialty && this.newDoctor.email) {
      const initials = this.newDoctor.name
        .replace('Dr.', '')
        .trim()
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'DR';

      const created: DoctorProfile = {
        id: `DOC-00${this.doctorsList.length + 1}`,
        name: this.newDoctor.name.startsWith('Dr.') ? this.newDoctor.name : `Dr. ${this.newDoctor.name}`,
        initials: initials,
        specialty: this.newDoctor.specialty,
        department: this.newDoctor.department || 'General Medicine',
        email: this.newDoctor.email,
        available: true,
        dutyStatus: 'On duty',
        slots: [
          { id: 's1', time: '09:00 AM', duration: '30 min', status: 'AVAILABLE' },
          { id: 's2', time: '09:45 AM', duration: '30 min', status: 'AVAILABLE' },
          { id: 's3', time: '10:30 AM', duration: '30 min', status: 'AVAILABLE' },
          { id: 's4', time: '11:15 AM', duration: '30 min', status: 'AVAILABLE' },
          { id: 's5', time: '02:00 PM', duration: '30 min', status: 'AVAILABLE' },
          { id: 's6', time: '02:45 PM', duration: '30 min', status: 'AVAILABLE' }
        ]
      };

      this.appointmentService.doctors.update(docs => [...docs, created]);
      this.newDoctor = { name: '', specialty: '', department: 'Cardiology', email: '' };
      this.showAddModal = false;
    }
  }
}
