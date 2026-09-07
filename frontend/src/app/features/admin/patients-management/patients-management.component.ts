import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService, ClinicPatient, DoctorProfile, DoctorSlot } from '../../../core/services/appointment.service';

@Component({
  selector: 'app-patients-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients-management.component.html',
  styleUrls: ['./patients-management.component.scss']
})
export class PatientsManagementComponent implements OnInit {
  appointmentService = inject(AppointmentService);

  searchTerm = '';
  statusFilter: 'ALL' | 'UNASSIGNED' | 'SCHEDULED' | 'IN_CONSULTATION' = 'ALL';

  // Assignment Modal State
  showAssignModal = false;
  selectedPatient: ClinicPatient | null = null;
  selectedDoctorId = '';
  selectedSlotTime = '';
  isPreferredChoice = false;
  selectedVisitType: ClinicPatient['visitType'] = 'Consultation';
  bookingNotes = '';

  // Register New Walk-in Patient Modal
  showRegisterModal = false;
  newPatient: Partial<ClinicPatient> = {
    name: '',
    age: 35,
    gender: 'M',
    phone: '',
    reason: '',
    condition: '',
    visitType: 'New Patient',
    preferredDoctorName: ''
  };

  toastMessage: string | null = null;

  ngOnInit(): void {
    // Default doctor selection if doctors exist
    const docs = this.appointmentService.doctors();
    if (docs.length > 0) {
      this.selectedDoctorId = docs[0].id;
    }
  }

  get patientsList(): ClinicPatient[] {
    return this.appointmentService.patients();
  }

  get doctorsList(): DoctorProfile[] {
    return this.appointmentService.doctors();
  }

  getAvailableSlotsCount(doc: DoctorProfile): number {
    return doc.slots.filter(s => s.status === 'AVAILABLE').length;
  }

  get filteredPatients(): ClinicPatient[] {
    return this.patientsList.filter(pat => {
      const matchesSearch = 
        pat.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        pat.phone.includes(this.searchTerm) ||
        pat.id.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        pat.reason.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (pat.assignedDoctorName && pat.assignedDoctorName.toLowerCase().includes(this.searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (this.statusFilter === 'UNASSIGNED') {
        return !pat.assignedDoctorId || pat.arrivalStatus === 'ARRIVED';
      }
      if (this.statusFilter === 'SCHEDULED') {
        return !!pat.assignedDoctorId && pat.arrivalStatus === 'SCHEDULED';
      }
      if (this.statusFilter === 'IN_CONSULTATION') {
        return pat.arrivalStatus === 'IN_CONSULTATION';
      }
      return true;
    });
  }

  get selectedDoctor(): DoctorProfile | undefined {
    return this.doctorsList.find(d => d.id === this.selectedDoctorId);
  }

  get currentDoctorSlots(): DoctorSlot[] {
    return this.selectedDoctor?.slots || [];
  }

  // Open Assign Modal for a specific patient
  openAssignModal(patient: ClinicPatient): void {
    this.selectedPatient = patient;
    this.selectedVisitType = patient.visitType || 'Consultation';
    this.bookingNotes = patient.bookingNotes || '';
    this.isPreferredChoice = !!patient.isPreferredDoctorChoice;

    // If patient already has preferred doctor or assigned doctor, pre-select it
    if (patient.assignedDoctorId) {
      this.selectedDoctorId = patient.assignedDoctorId;
    } else if (patient.preferredDoctorName) {
      const match = this.doctorsList.find(d => d.name.toLowerCase().includes(patient.preferredDoctorName!.toLowerCase()));
      if (match) {
        this.selectedDoctorId = match.id;
        this.isPreferredChoice = true;
      }
    } else {
      // Default to first available doctor
      const availableDoc = this.doctorsList.find(d => d.available) || this.doctorsList[0];
      if (availableDoc) {
        this.selectedDoctorId = availableDoc.id;
      }
    }

    // Auto-select first available slot
    const slots = this.currentDoctorSlots;
    const firstAvail = slots.find(s => s.status === 'AVAILABLE');
    this.selectedSlotTime = firstAvail ? firstAvail.time : (patient.assignedTimeSlot || '');

    this.showAssignModal = true;
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedPatient = null;
  }

  onDoctorChange(doctorId: string): void {
    this.selectedDoctorId = doctorId;
    const slots = this.currentDoctorSlots;
    const firstAvail = slots.find(s => s.status === 'AVAILABLE');
    this.selectedSlotTime = firstAvail ? firstAvail.time : '';
  }

  selectSlot(slot: DoctorSlot): void {
    if (slot.status === 'BOOKED' && slot.bookedPatientId !== this.selectedPatient?.id) {
      return; // Slot already taken
    }
    this.selectedSlotTime = slot.time;
  }

  confirmAssignment(): void {
    if (!this.selectedPatient) return;
    if (!this.selectedDoctorId) {
      alert('Please select a doctor to assign.');
      return;
    }
    if (!this.selectedSlotTime) {
      alert('Please select an available timing slot for this doctor.');
      return;
    }

    const doc = this.selectedDoctor;
    const res = this.appointmentService.assignDoctorAndSlot(
      this.selectedPatient.id,
      this.selectedDoctorId,
      this.selectedSlotTime,
      this.isPreferredChoice,
      doc?.name,
      this.selectedVisitType,
      this.bookingNotes
    );

    if (res.success) {
      this.showToast(res.message);
      this.closeAssignModal();
    } else {
      alert(res.message);
    }
  }

  // Register Walk-in Patient Modal
  openRegisterModal(): void {
    this.newPatient = {
      name: '',
      age: 38,
      gender: 'M',
      phone: '+1 (555) ',
      reason: '',
      condition: 'Initial assessment',
      visitType: 'New Patient',
      preferredDoctorName: ''
    };
    this.showRegisterModal = true;
  }

  closeRegisterModal(): void {
    this.showRegisterModal = false;
  }

  saveNewPatient(): void {
    if (!this.newPatient.name?.trim()) {
      alert('Please enter patient full name.');
      return;
    }
    if (!this.newPatient.reason?.trim()) {
      alert('Please specify reason for visit.');
      return;
    }

    const created = this.appointmentService.registerWalkinPatient(this.newPatient);
    this.showToast(`✓ Registered ${created.name} (${created.id}). Ready for doctor allocation.`);
    this.closeRegisterModal();

    // Automatically prompt to assign a doctor
    setTimeout(() => {
      this.openAssignModal(created);
    }, 400);
  }

  showToast(msg: string): void {
    this.toastMessage = msg;
    setTimeout(() => {
      if (this.toastMessage === msg) {
        this.toastMessage = null;
      }
    }, 5000);
  }
}
