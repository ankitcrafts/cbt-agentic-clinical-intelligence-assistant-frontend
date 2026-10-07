import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService, DoctorProfile } from '../../../core/services/appointment.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent {
  authService = inject(AuthService);
  appointmentService = inject(AppointmentService);

  todayDate = 'Wednesday, August 13, 2026';

  get doctors(): DoctorProfile[] {
    return this.appointmentService.doctors();
  }

  get totalPatients(): number {
    return this.appointmentService.totalPatientsCount();
  }

  get unassignedCount(): number {
    return this.appointmentService.unassignedPatientsCount();
  }

  get activeDoctorsCount(): number {
    return this.appointmentService.activeDoctorsOnDuty();
  }

  get scheduledCount(): number {
    return this.appointmentService.scheduledPatientsCount();
  }

  getDoctorPatientsCount(docId: string): number {
    return this.appointmentService.patients().filter(p => p.assignedDoctorId === docId).length;
  }

  getDoctorAvailableSlotsCount(doc: DoctorProfile): number {
    return doc.slots.filter(s => s.status === 'AVAILABLE').length;
  }

  getDoctorLoadPct(doc: DoctorProfile): number {
    const totalSlots = doc.slots.length;
    if (totalSlots === 0) return 0;
    const booked = doc.slots.filter(s => s.status === 'BOOKED').length;
    return Math.round((booked / totalSlots) * 100);
  }

  getDoctorLoadColor(pct: number): string {
    if (pct >= 75) return '#d97706';
    if (pct >= 50) return '#0d9488';
    return '#10b981';
  }

  goToPatientDesk(): void {
    this.authService.currentStep.set(3); // Step 3 corresponds to Patients Management in Admin Flow
  }

  goToDoctorDesk(): void {
    this.authService.currentStep.set(2); // Step 2 corresponds to Doctors Management in Admin Flow
  }
}
