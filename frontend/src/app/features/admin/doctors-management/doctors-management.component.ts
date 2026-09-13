import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService, ClinicPatient, DoctorProfile, DoctorSlot } from '../../../core/services/appointment.service';

@Component({
  selector: 'app-doctors-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctors-management.component.html',
  styleUrls: ['./doctors-management.component.scss']
})
export class DoctorsManagementComponent implements OnInit {
  authService = inject(AuthService);
  appointmentService = inject(AppointmentService);

  searchTerm = '';
  statusFilter: 'ALL' | 'ON_DUTY' | 'OFF_DUTY' | 'NEW_UPCOMING' | 'EXISTING' = 'ALL';
  departmentFilter: string = 'ALL';

  goBackToDashboard(): void {
    this.authService.currentStep.set(1);
  }

  // Register New Doctor Modal State
  showAddModal = false;
  newDoctor: Partial<DoctorProfile> & { slotDuration?: string } = {
    name: '',
    specialty: '',
    department: 'Cardiology',
    email: '',
    phone: '+1 (555) 201-',
    room: 'Suite 101',
    experience: 'New Upcoming Specialist',
    qualification: 'MD, MBBS',
    isNewUpcoming: true,
    shiftTiming: '09:00 AM - 05:00 PM',
    dutyStatus: 'On duty',
    slotDuration: '30 min'
  };

  // Edit Doctor Modal State
  showEditModal = false;
  editingDoctor: DoctorProfile | null = null;
  editForm: Partial<DoctorProfile> = {};

  // Doctor Queue Modal State
  showQueueModal = false;
  selectedDoctorForQueue: DoctorProfile | null = null;

  // Manage Slots Modal State
  showSlotsModal = false;
  selectedDoctorForSlots: DoctorProfile | null = null;
  newSlotTime = '12:00 PM';
  newSlotDuration = '30 min';

  // Toast Notification
  toastMessage: string | null = null;
  isProcessing = false;

  departmentsList: string[] = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Internal Medicine',
    'Psychiatry',
    'General Surgery',
    'Dermatology',
    'Endocrinology'
  ];

  ngOnInit(): void {
    this.appointmentService.fetchDataFromBackend();
  }

  get doctorsList(): DoctorProfile[] {
    return this.appointmentService.doctors();
  }

  get patientsList(): ClinicPatient[] {
    return this.appointmentService.patients();
  }

  get totalDoctorsCount(): number {
    return this.doctorsList.length;
  }

  get onDutyCount(): number {
    return this.doctorsList.filter(d => d.available && d.dutyStatus === 'On duty').length;
  }

  get offDutyCount(): number {
    return this.doctorsList.filter(d => !d.available || d.dutyStatus === 'Off duty').length;
  }

  get newUpcomingCount(): number {
    return this.doctorsList.filter(d => d.isNewUpcoming).length;
  }

  get existingCliniciansCount(): number {
    return this.doctorsList.filter(d => !d.isNewUpcoming).length;
  }

  get totalAvailableSlotsCount(): number {
    return this.doctorsList.reduce((acc, doc) => acc + doc.slots.filter(s => s.status === 'AVAILABLE').length, 0);
  }

  get totalBookedSlotsCount(): number {
    return this.doctorsList.reduce((acc, doc) => acc + doc.slots.filter(s => s.status === 'BOOKED').length, 0);
  }

  get filteredDoctors(): DoctorProfile[] {
    return this.doctorsList.filter(doc => {
      const term = this.searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !term ||
        doc.name.toLowerCase().includes(term) ||
        doc.specialty.toLowerCase().includes(term) ||
        doc.department.toLowerCase().includes(term) ||
        doc.email.toLowerCase().includes(term) ||
        doc.id.toLowerCase().includes(term) ||
        (doc.room && doc.room.toLowerCase().includes(term)) ||
        (doc.qualification && doc.qualification.toLowerCase().includes(term)) ||
        (doc.experience && doc.experience.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      // Department filter
      if (this.departmentFilter !== 'ALL' && doc.department.toLowerCase() !== this.departmentFilter.toLowerCase()) {
        return false;
      }

      // Status filter
      if (this.statusFilter === 'ON_DUTY') {
        return doc.available && doc.dutyStatus === 'On duty';
      }
      if (this.statusFilter === 'OFF_DUTY') {
        return !doc.available || doc.dutyStatus === 'Off duty';
      }
      if (this.statusFilter === 'NEW_UPCOMING') {
        return !!doc.isNewUpcoming;
      }
      if (this.statusFilter === 'EXISTING') {
        return !doc.isNewUpcoming;
      }

      return true;
    });
  }

  getAvailableSlots(doc: DoctorProfile): number {
    return doc.slots.filter(s => s.status === 'AVAILABLE').length;
  }

  getBookedSlots(doc: DoctorProfile): number {
    return doc.slots.filter(s => s.status === 'BOOKED').length;
  }

  getDoctorOccupancyPct(doc: DoctorProfile): number {
    if (!doc.slots || doc.slots.length === 0) return 0;
    const booked = this.getBookedSlots(doc);
    return Math.round((booked / doc.slots.length) * 100);
  }

  getDoctorOccupancyColor(pct: number): string {
    if (pct >= 75) return '#f59e0b';
    if (pct >= 50) return '#0d9488';
    return '#10b981';
  }

  getDoctorQueue(doc: DoctorProfile): ClinicPatient[] {
    return this.appointmentService.getDoctorQueue(doc.name, doc.id);
  }

  // Register Modal Actions
  toggleAddModal(): void {
    this.showAddModal = !this.showAddModal;
    if (this.showAddModal) {
      this.newDoctor = {
        name: '',
        specialty: '',
        department: 'Cardiology',
        email: '',
        phone: '+1 (555) 201-',
        room: `Suite ${Math.floor(100 + Math.random() * 400)}`,
        experience: 'New Upcoming Specialist',
        qualification: 'MD, MBBS',
        isNewUpcoming: true,
        shiftTiming: '09:00 AM - 05:00 PM',
        dutyStatus: 'On duty',
        slotDuration: '30 min'
      };
    }
  }

  async addDoctor(): Promise<void> {
    if (!this.newDoctor.name || !this.newDoctor.specialty || !this.newDoctor.email) {
      this.toastMessage = 'Please provide full name, medical specialty, and hospital email.';
      return;
    }

    this.isProcessing = true;
    try {
      const res = await this.appointmentService.registerDoctor({
        name: this.newDoctor.name,
        specialty: this.newDoctor.specialty,
        department: this.newDoctor.department,
        email: this.newDoctor.email,
        phone: this.newDoctor.phone,
        room: this.newDoctor.room,
        experience: this.newDoctor.experience,
        qualification: this.newDoctor.qualification,
        isNewUpcoming: this.newDoctor.isNewUpcoming,
        shiftTiming: this.newDoctor.shiftTiming,
        dutyStatus: this.newDoctor.dutyStatus
      });

      this.showAddModal = false;
      this.toastMessage = res.message;
    } catch (err: any) {
      this.toastMessage = 'Failed to register doctor. Please try again.';
    } finally {
      this.isProcessing = false;
    }
  }

  // Quick Duty Toggle
  async toggleDutyStatus(doc: DoctorProfile, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    try {
      const res = await this.appointmentService.toggleDoctorDuty(doc.id);
      this.toastMessage = `Status updated for ${doc.name}: ${res.newStatus}.`;
    } catch (e) {
      this.toastMessage = 'Could not update duty status.';
    }
  }

  // Edit Modal Actions
  openEditModal(doc: DoctorProfile, event?: Event): void {
    if (event) event.stopPropagation();
    this.editingDoctor = doc;
    this.editForm = {
      name: doc.name,
      specialty: doc.specialty,
      department: doc.department,
      email: doc.email,
      phone: doc.phone || '+1 (555) 201-4400',
      room: doc.room || 'Suite 101',
      experience: doc.experience || 'Attending Specialist',
      qualification: doc.qualification || 'MD',
      isNewUpcoming: doc.isNewUpcoming,
      shiftTiming: doc.shiftTiming || '09:00 AM - 05:00 PM',
      dutyStatus: doc.dutyStatus
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingDoctor = null;
    this.editForm = {};
  }

  async saveDoctorEdit(): Promise<void> {
    if (!this.editingDoctor) return;

    this.isProcessing = true;
    try {
      const res = await this.appointmentService.updateDoctor(this.editingDoctor.id, this.editForm);
      this.toastMessage = `✓ ${this.editForm.name || this.editingDoctor.name} profile updated successfully.`;
      this.closeEditModal();
    } catch (e) {
      this.toastMessage = 'Failed to save changes.';
    } finally {
      this.isProcessing = false;
    }
  }

  // Queue Modal Actions
  openQueueModal(doc: DoctorProfile, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedDoctorForQueue = doc;
    this.showQueueModal = true;
  }

  closeQueueModal(): void {
    this.showQueueModal = false;
    this.selectedDoctorForQueue = null;
  }

  // Slots Modal Actions
  openSlotsModal(doc: DoctorProfile, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedDoctorForSlots = doc;
    this.newSlotTime = '12:00 PM';
    this.newSlotDuration = '30 min';
    this.showSlotsModal = true;
  }

  closeSlotsModal(): void {
    this.showSlotsModal = false;
    this.selectedDoctorForSlots = null;
  }

  async addSlotToDoctor(): Promise<void> {
    if (!this.selectedDoctorForSlots || !this.newSlotTime) return;

    try {
      const res = await this.appointmentService.addDoctorSlot(
        this.selectedDoctorForSlots.id,
        this.newSlotTime,
        this.newSlotDuration
      );
      this.toastMessage = res.message;
      // Refresh current doctor reference
      this.selectedDoctorForSlots = this.doctorsList.find(d => d.id === this.selectedDoctorForSlots?.id) || null;
    } catch (e) {
      this.toastMessage = 'Could not add timing slot.';
    }
  }

  async removeSlot(slot: DoctorSlot): Promise<void> {
    if (!this.selectedDoctorForSlots) return;

    if (slot.status === 'BOOKED') {
      this.toastMessage = `Slot ${slot.time} is booked for ${slot.bookedPatientName}. Please reassign the patient before deleting.`;
      return;
    }

    try {
      const res = await this.appointmentService.deleteDoctorSlot(this.selectedDoctorForSlots.id, slot.id);
      this.toastMessage = `Slot ${slot.time} removed.`;
      this.selectedDoctorForSlots = this.doctorsList.find(d => d.id === this.selectedDoctorForSlots?.id) || null;
    } catch (e) {
      this.toastMessage = 'Could not remove slot.';
    }
  }

  async deleteDoctorProfile(doc: DoctorProfile, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const confirmed = confirm(`Are you sure you want to remove ${doc.name} from the hospital roster?`);
    if (!confirmed) return;

    try {
      const res = await this.appointmentService.deleteDoctor(doc.id);
      this.toastMessage = res.message;
    } catch (e) {
      this.toastMessage = 'Failed to remove doctor.';
    }
  }
}
