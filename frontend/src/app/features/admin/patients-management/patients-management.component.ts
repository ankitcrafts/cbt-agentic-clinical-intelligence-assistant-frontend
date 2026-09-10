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
  statusFilter: 'ALL' | 'UNASSIGNED' | 'SCHEDULED' | 'IN_CONSULTATION' | 'PREFERRED' | 'RETURNING' = 'ALL';

  // Assignment Modal State
  showAssignModal = false;
  selectedPatient: ClinicPatient | null = null;
  selectedDoctorId = '';
  selectedSlotTime = '';
  isPreferredChoice = false;
  selectedVisitType: ClinicPatient['visitType'] = 'Consultation';
  bookingNotes = '';
  isAssigning = false;

  // Patient Past History / Records Modal State
  showHistoryModal = false;
  historyPatient: ClinicPatient | null = null;
  patientSessionsList: any[] = [];
  isLoadingHistory = false;

  // Register New Walk-in Patient Modal State
  showRegisterModal = false;
  newPatient: Partial<ClinicPatient> = {
    name: '',
    age: 35,
    gender: 'M',
    phone: '+1 (555) ',
    reason: '',
    condition: 'Triage review',
    visitType: 'New Patient',
    preferredDoctorName: '',
    isPreferredDoctorChoice: false,
    vitals: { bp: '120/80 mmHg', hr: '72 bpm', pain: '0/10', spo2: '98%', temp: '36.6 °C' }
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

  get returningPatientsCount(): number {
    return this.patientsList.filter(p => (p.totalPastSessions && p.totalPastSessions > 0) || (p.lastVisit && p.lastVisit !== '—')).length;
  }

  get preferredRequestsCount(): number {
    return this.patientsList.filter(p => p.isPreferredDoctorChoice || p.preferredDoctorName).length;
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
        (pat.assignedDoctorName && pat.assignedDoctorName.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (pat.preferredDoctorName && pat.preferredDoctorName.toLowerCase().includes(this.searchTerm.toLowerCase()));

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
      if (this.statusFilter === 'PREFERRED') {
        return !!pat.isPreferredDoctorChoice || !!pat.preferredDoctorName;
      }
      if (this.statusFilter === 'RETURNING') {
        return (pat.totalPastSessions && pat.totalPastSessions > 0) || (pat.lastVisit && pat.lastVisit !== '—');
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
    this.isPreferredChoice = !!patient.isPreferredDoctorChoice || !!patient.preferredDoctorName;

    // If patient already has preferred doctor or assigned doctor, pre-select it
    if (patient.assignedDoctorId) {
      this.selectedDoctorId = patient.assignedDoctorId;
    } else if (patient.preferredDoctorName) {
      const match = this.doctorsList.find(d => 
        d.name.toLowerCase().includes(patient.preferredDoctorName!.toLowerCase()) ||
        patient.preferredDoctorName!.toLowerCase().includes(d.name.toLowerCase())
      );
      if (match) {
        this.selectedDoctorId = match.id;
        this.isPreferredChoice = true;
      }
    } else {
      // Default to first available doctor with available slots
      const availableDoc = this.doctorsList.find(d => d.available && this.getAvailableSlotsCount(d) > 0) || this.doctorsList[0];
      if (availableDoc) {
        this.selectedDoctorId = availableDoc.id;
      }
    }

    // Auto-select first available slot or patient's currently booked slot
    const slots = this.currentDoctorSlots;
    if (patient.assignedTimeSlot && slots.some(s => s.time === patient.assignedTimeSlot)) {
      this.selectedSlotTime = patient.assignedTimeSlot;
    } else {
      const firstAvail = slots.find(s => s.status === 'AVAILABLE');
      this.selectedSlotTime = firstAvail ? firstAvail.time : '';
    }

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

  async confirmAssignment(): Promise<void> {
    if (!this.selectedPatient) return;
    if (!this.selectedDoctorId) {
      alert('Please select a doctor to assign.');
      return;
    }
    if (!this.selectedSlotTime) {
      alert('Please select an available timing slot for this doctor.');
      return;
    }

    this.isAssigning = true;
    try {
      const doc = this.selectedDoctor;
      const res = await this.appointmentService.assignDoctorAndSlot(
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
    } finally {
      this.isAssigning = false;
    }
  }

  // Open Past History / Records Modal
  async openHistoryModal(patient: ClinicPatient): Promise<void> {
    this.historyPatient = patient;
    this.showHistoryModal = true;
    this.isLoadingHistory = true;
    try {
      this.patientSessionsList = await this.appointmentService.getPatientSessions(patient.id);
    } catch (e) {
      this.patientSessionsList = [];
    } finally {
      this.isLoadingHistory = false;
    }
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.historyPatient = null;
    this.patientSessionsList = [];
  }

  // Discharge / Free Slot
  async dischargePatient(patient: ClinicPatient): Promise<void> {
    const confirmDischarge = confirm(`Discharge patient ${patient.name} (${patient.id}) and release booked slot?`);
    if (!confirmDischarge) return;

    const res = await this.appointmentService.deletePatient(patient.id);
    this.showToast(res.message);
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
      preferredDoctorName: '',
      isPreferredDoctorChoice: false,
      vitals: { bp: '120/80 mmHg', hr: '72 bpm', pain: '0/10', spo2: '98%', temp: '36.6 °C' }
    };
    this.showRegisterModal = true;
  }

  closeRegisterModal(): void {
    this.showRegisterModal = false;
  }

  async saveNewPatient(): Promise<void> {
    if (!this.newPatient.name?.trim()) {
      alert('Please enter patient full name.');
      return;
    }
    if (!this.newPatient.reason?.trim()) {
      alert('Please specify reason for visit / triage complaint.');
      return;
    }

    const created = await this.appointmentService.registerWalkinPatient(this.newPatient);
    this.showToast(`✓ Registered ${created.name} (${created.id}). Ready for doctor allocation.`);
    this.closeRegisterModal();

    // Automatically open doctor assignment modal for this newly registered patient
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
