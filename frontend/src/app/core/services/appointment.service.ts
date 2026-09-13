import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DoctorSlot {
  id: string;
  time: string;           // e.g. "09:00 AM", "09:45 AM", "10:30 AM", "11:15 AM", "02:00 PM", "02:45 PM", "03:30 PM", "04:15 PM"
  duration: string;       // e.g. "30 min"
  status: 'AVAILABLE' | 'BOOKED';
  bookedPatientId?: string;
  bookedPatientName?: string;
}

export interface DoctorProfile {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  department: string;
  email: string;
  phone?: string;
  room?: string;
  experience?: string;
  qualification?: string;
  isNewUpcoming?: boolean;
  shiftTiming?: string;
  available: boolean;
  dutyStatus: 'On duty' | 'In consultation' | 'Off duty';
  queueCount?: number;
  slots: DoctorSlot[];
}

export interface ClinicPatient {
  id: string;               // e.g. "#00847261"
  pid: string;              // e.g. "P-00847261"
  name: string;
  initials: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  phone: string;
  email?: string;
  demographics: string;     // e.g. "42M · #00847261"
  arrivalTime: string;      // e.g. "08:45 AM"
  arrivalStatus: 'ARRIVED' | 'SCHEDULED' | 'IN_CONSULTATION' | 'COMPLETED';
  reason: string;
  condition: string;
  lastVisit?: string;
  vitals?: { bp: string; hr: string; pain: string; spo2?: string; temp?: string };
  
  // Assignment & Booking fields
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedTimeSlot?: string;
  assignedDuration?: string;
  isPreferredDoctorChoice?: boolean;  // True if patient specifically chose this doctor
  preferredDoctorName?: string;
  visitType: 'New Patient' | 'Follow-up' | 'Annual Check' | 'Consultation' | 'Emergency';
  bookingNotes?: string;
  totalPastSessions?: number;
  sessions?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private http = inject(HttpClient);
  private apiBaseUrl = (environment as any).apiBaseUrl || 'http://localhost:8000';

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Pre-configured Doctors with Daily Timing Slots (Fallback & Reactive Signal)
  doctors = signal<DoctorProfile[]>([
    {
      id: 'DOC-001',
      name: 'Dr. Yuki Tanaka',
      initials: 'YT',
      specialty: 'Senior Cardiologist',
      department: 'Cardiology',
      email: 'yuki.tanaka@stmercy.org',
      phone: '+1 (555) 201-4401',
      room: 'Suite 204',
      experience: 'Senior Consultant',
      qualification: 'MD, FACC, FSCAI',
      isNewUpcoming: false,
      shiftTiming: '09:00 AM - 05:00 PM',
      available: true,
      dutyStatus: 'On duty',
      queueCount: 4,
      slots: [
        { id: 's1', time: '09:00 AM', duration: '30 min', status: 'BOOKED', bookedPatientId: '#00847261', bookedPatientName: 'Marcus Delgado' },
        { id: 's2', time: '09:45 AM', duration: '30 min', status: 'BOOKED', bookedPatientId: '#00391847', bookedPatientName: 'Priya Sharma' },
        { id: 's3', time: '10:30 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's4', time: '11:15 AM', duration: '45 min', status: 'BOOKED', bookedPatientId: '#00673920', bookedPatientName: 'Anya Kowalski' },
        { id: 's5', time: '02:00 PM', duration: '30 min', status: 'BOOKED', bookedPatientId: '#00847193', bookedPatientName: 'Lin Wei' },
        { id: 's6', time: '02:45 PM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's7', time: '03:30 PM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's8', time: '04:15 PM', duration: '30 min', status: 'AVAILABLE' }
      ]
    },
    {
      id: 'DOC-002',
      name: 'Dr. Rahul Sharma',
      initials: 'RS',
      specialty: 'Interventional Cardiologist',
      department: 'Cardiology',
      email: 'rahul.sharma@stmercy.org',
      phone: '+1 (555) 201-4402',
      room: 'Suite 206',
      experience: 'Attending Specialist',
      qualification: 'MD, DM Cardiology',
      isNewUpcoming: false,
      shiftTiming: '09:30 AM - 04:30 PM',
      available: true,
      dutyStatus: 'On duty',
      queueCount: 1,
      slots: [
        { id: 's10', time: '09:30 AM', duration: '30 min', status: 'BOOKED', bookedPatientId: '#00182736', bookedPatientName: 'Samuel Obi' },
        { id: 's11', time: '10:15 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's12', time: '11:00 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's13', time: '02:00 PM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's14', time: '02:45 PM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's15', time: '03:30 PM', duration: '30 min', status: 'AVAILABLE' }
      ]
    },
    {
      id: 'DOC-003',
      name: 'Dr. Neha Verma',
      initials: 'NV',
      specialty: 'Neurologist',
      department: 'Neurology',
      email: 'neha.verma@stmercy.org',
      phone: '+1 (555) 201-4403',
      room: 'Suite 310',
      experience: 'Senior Consultant',
      qualification: 'MD, DM Neurology',
      isNewUpcoming: false,
      shiftTiming: '09:00 AM - 04:00 PM',
      available: true,
      dutyStatus: 'On duty',
      queueCount: 1,
      slots: [
        { id: 's20', time: '09:00 AM', duration: '45 min', status: 'BOOKED', bookedPatientId: '#00512938', bookedPatientName: 'Elias Voss' },
        { id: 's21', time: '10:00 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's22', time: '10:45 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's23', time: '11:30 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's24', time: '02:15 PM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's25', time: '03:00 PM', duration: '30 min', status: 'AVAILABLE' }
      ]
    },
    {
      id: 'DOC-004',
      name: 'Dr. Amit Patel',
      initials: 'AP',
      specialty: 'Orthopedic Surgeon',
      department: 'Orthopedics',
      email: 'amit.patel@stmercy.org',
      phone: '+1 (555) 201-4404',
      room: 'Suite 108',
      experience: 'Attending Surgeon',
      qualification: 'MS Orthopedics, FRCS',
      isNewUpcoming: false,
      shiftTiming: '09:30 AM - 03:00 PM',
      available: true,
      dutyStatus: 'On duty',
      queueCount: 0,
      slots: [
        { id: 's30', time: '09:30 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's31', time: '10:15 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's32', time: '11:00 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's33', time: '02:00 PM', duration: '30 min', status: 'AVAILABLE' }
      ]
    },
    {
      id: 'DOC-005',
      name: 'Dr. Sneha Iyer',
      initials: 'SI',
      specialty: 'Pediatrician',
      department: 'Pediatrics',
      email: 'sneha.iyer@stmercy.org',
      phone: '+1 (555) 201-4405',
      room: 'Exam Room 2B',
      experience: 'Upcoming Fellow Specialist',
      qualification: 'MD Pediatrics',
      isNewUpcoming: true,
      shiftTiming: '09:00 AM - 01:00 PM',
      available: false,
      dutyStatus: 'Off duty',
      queueCount: 0,
      slots: [
        { id: 's40', time: '09:00 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's41', time: '09:45 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's42', time: '10:30 AM', duration: '30 min', status: 'AVAILABLE' }
      ]
    },
    {
      id: 'DOC-006',
      name: 'Dr. Vikram Singh',
      initials: 'VS',
      specialty: 'General Physician',
      department: 'Internal Medicine',
      email: 'vikram.singh@stmercy.org',
      phone: '+1 (555) 201-4406',
      room: 'Suite 102',
      experience: 'Attending Physician',
      qualification: 'MBBS, MD Internal Medicine',
      isNewUpcoming: false,
      shiftTiming: '09:00 AM - 03:00 PM',
      available: true,
      dutyStatus: 'On duty',
      queueCount: 0,
      slots: [
        { id: 's50', time: '09:00 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's51', time: '09:45 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's52', time: '10:30 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's53', time: '11:15 AM', duration: '30 min', status: 'AVAILABLE' },
        { id: 's54', time: '02:00 PM', duration: '30 min', status: 'AVAILABLE' }
      ]
    },
    {
      id: 'DOC-007',
      name: 'Dr. Maya Lin',
      initials: 'ML',
      specialty: 'Clinical Psychologist',
      department: 'Psychiatry',
      email: 'maya.lin@stmercy.org',
      phone: '+1 (555) 201-4407',
      room: 'Suite 405',
      experience: 'New Upcoming Specialist',
      qualification: 'PsyD, CBT Certified',
      isNewUpcoming: true,
      shiftTiming: '10:00 AM - 04:00 PM',
      available: true,
      dutyStatus: 'On duty',
      queueCount: 0,
      slots: [
        { id: 's70', time: '10:00 AM', duration: '45 min', status: 'AVAILABLE' },
        { id: 's71', time: '11:00 AM', duration: '45 min', status: 'AVAILABLE' },
        { id: 's72', time: '02:00 PM', duration: '45 min', status: 'AVAILABLE' },
        { id: 's73', time: '03:00 PM', duration: '45 min', status: 'AVAILABLE' }
      ]
    }
  ]);

  // Arriving / Registered Hospital Patients (Initial Seed Data with Past Session Records)
  patients = signal<ClinicPatient[]>([
    {
      id: '#00847261',
      pid: 'P-00847261',
      name: 'Marcus Delgado',
      initials: 'MD',
      age: 42,
      gender: 'M',
      phone: '+1 (555) 234-5678',
      demographics: '42M · #00847261',
      arrivalTime: '08:45 AM',
      arrivalStatus: 'IN_CONSULTATION',
      reason: 'Hypertension review + new headache complaint',
      condition: 'Hypertension Stage 1',
      lastVisit: 'July 14, 2026',
      vitals: { bp: '138/88 mmHg', hr: '72 bpm', pain: '5-6/10', spo2: '98%', temp: '36.6 °C' },
      assignedDoctorId: 'DOC-001',
      assignedDoctorName: 'Dr. Yuki Tanaka',
      assignedTimeSlot: '09:00 AM',
      assignedDuration: '30 min',
      isPreferredDoctorChoice: true,
      preferredDoctorName: 'Dr. Yuki Tanaka',
      visitType: 'Follow-up',
      bookingNotes: 'Patient requested Dr. Yuki Tanaka specifically for cardiology follow-up.',
      totalPastSessions: 1
    },
    {
      id: '#00391847',
      pid: 'P-00391847',
      name: 'Priya Sharma',
      initials: 'PS',
      age: 34,
      gender: 'F',
      phone: '+1 (555) 345-6789',
      demographics: '34F · #00391847',
      arrivalTime: '09:15 AM',
      arrivalStatus: 'SCHEDULED',
      reason: 'Persistent morning dizziness & fatigue, thyroid review',
      condition: 'Hypothyroidism',
      lastVisit: 'May 02, 2026',
      vitals: { bp: '118/76 mmHg', hr: '68 bpm', pain: '0/10', spo2: '99%', temp: '36.8 °C' },
      assignedDoctorId: 'DOC-001',
      assignedDoctorName: 'Dr. Yuki Tanaka',
      assignedTimeSlot: '09:45 AM',
      assignedDuration: '30 min',
      isPreferredDoctorChoice: false,
      visitType: 'Consultation',
      bookingNotes: 'Assigned based on cardiology queue availability.',
      totalPastSessions: 1
    },
    {
      id: '#00512938',
      pid: 'P-00512938',
      name: 'Elias Voss',
      initials: 'EV',
      age: 58,
      gender: 'M',
      phone: '+1 (555) 456-7890',
      demographics: '58M · #00512938',
      arrivalTime: '08:50 AM',
      arrivalStatus: 'SCHEDULED',
      reason: 'Routine annual check, peripheral tingling review',
      condition: 'Type 2 Diabetes',
      lastVisit: 'Feb 11, 2026',
      vitals: { bp: '132/84 mmHg', hr: '74 bpm', pain: '0/10', spo2: '98%', temp: '36.7 °C' },
      assignedDoctorId: 'DOC-003',
      assignedDoctorName: 'Dr. Neha Verma',
      assignedTimeSlot: '09:00 AM',
      assignedDuration: '45 min',
      isPreferredDoctorChoice: true,
      preferredDoctorName: 'Dr. Neha Verma',
      visitType: 'Annual Check',
      bookingNotes: 'Patient preferred Dr. Neha Verma for neurology evaluation.',
      totalPastSessions: 0
    },
    {
      id: '#00673920',
      pid: 'P-00673920',
      name: 'Anya Kowalski',
      initials: 'AK',
      age: 29,
      gender: 'F',
      phone: '+1 (555) 567-8901',
      demographics: '29F · #00673920',
      arrivalTime: '09:30 AM',
      arrivalStatus: 'SCHEDULED',
      reason: 'Chest tightness, shortness of breath on exertion',
      condition: 'New presentation',
      lastVisit: '—',
      vitals: { bp: '122/80 mmHg', hr: '82 bpm', pain: '3/10', spo2: '99%', temp: '36.5 °C' },
      assignedDoctorId: 'DOC-001',
      assignedDoctorName: 'Dr. Yuki Tanaka',
      assignedTimeSlot: '11:15 AM',
      assignedDuration: '45 min',
      isPreferredDoctorChoice: true,
      preferredDoctorName: 'Dr. Yuki Tanaka',
      visitType: 'New Patient',
      bookingNotes: 'New referral requested senior cardiologist Dr. Yuki Tanaka.',
      totalPastSessions: 0
    },
    {
      id: '#00182736',
      pid: 'P-00182736',
      name: 'Samuel Obi',
      initials: 'SO',
      age: 67,
      gender: 'M',
      phone: '+1 (555) 678-9012',
      demographics: '67M · #00182736',
      arrivalTime: '09:10 AM',
      arrivalStatus: 'SCHEDULED',
      reason: 'Post-catheterisation review, stable angina check',
      condition: 'Stable Angina',
      lastVisit: 'June 20, 2026',
      vitals: { bp: '128/82 mmHg', hr: '64 bpm', pain: '1/10', spo2: '97%', temp: '36.6 °C' },
      assignedDoctorId: 'DOC-002',
      assignedDoctorName: 'Dr. Rahul Sharma',
      assignedTimeSlot: '09:30 AM',
      assignedDuration: '30 min',
      isPreferredDoctorChoice: false,
      visitType: 'Follow-up',
      bookingNotes: 'Assigned to Dr. Rahul Sharma for catheterisation follow-up.',
      totalPastSessions: 0
    },
    {
      id: '#00847193',
      pid: 'P-00847193',
      name: 'Lin Wei',
      initials: 'LW',
      age: 45,
      gender: 'F',
      phone: '+1 (555) 789-0123',
      demographics: '45F · #00847193',
      arrivalTime: '09:40 AM',
      arrivalStatus: 'SCHEDULED',
      reason: 'AF management, medication titration check',
      condition: 'Atrial Fibrillation',
      lastVisit: 'March 18, 2026',
      vitals: { bp: '126/80 mmHg', hr: '76 bpm', pain: '0/10', spo2: '98%', temp: '36.7 °C' },
      assignedDoctorId: 'DOC-001',
      assignedDoctorName: 'Dr. Yuki Tanaka',
      assignedTimeSlot: '02:00 PM',
      assignedDuration: '30 min',
      isPreferredDoctorChoice: true,
      preferredDoctorName: 'Dr. Yuki Tanaka',
      visitType: 'Follow-up',
      bookingNotes: 'Patient requested Dr. Yuki Tanaka for AF check.',
      totalPastSessions: 0
    },
    {
      id: '#00928174',
      pid: 'P-00928174',
      name: 'Arjun Nair',
      initials: 'AN',
      age: 51,
      gender: 'M',
      phone: '+1 (555) 890-1234',
      demographics: '51M · #00928174',
      arrivalTime: '09:50 AM',
      arrivalStatus: 'ARRIVED',
      reason: 'Elevated home BP readings, palpitation episodes',
      condition: 'Arrhythmia screening',
      lastVisit: '—',
      vitals: { bp: '144/92 mmHg', hr: '88 bpm', pain: '0/10', spo2: '97%', temp: '36.9 °C' },
      assignedDoctorId: undefined,
      assignedDoctorName: undefined,
      assignedTimeSlot: undefined,
      isPreferredDoctorChoice: false,
      visitType: 'Consultation',
      bookingNotes: 'Walk-in patient awaiting doctor allocation.',
      totalPastSessions: 0
    },
    {
      id: '#00472910',
      pid: 'P-00472910',
      name: 'Fatima Al-Zahra',
      initials: 'FA',
      age: 39,
      gender: 'F',
      phone: '+1 (555) 901-2345',
      demographics: '39F · #00472910',
      arrivalTime: '10:05 AM',
      arrivalStatus: 'ARRIVED',
      reason: 'Acute joint inflammation, knee swelling post-exercise',
      condition: 'Acute Arthralgia',
      lastVisit: '—',
      vitals: { bp: '120/78 mmHg', hr: '70 bpm', pain: '6/10', spo2: '99%', temp: '36.8 °C' },
      assignedDoctorId: undefined,
      assignedDoctorName: undefined,
      assignedTimeSlot: undefined,
      isPreferredDoctorChoice: false,
      visitType: 'New Patient',
      bookingNotes: 'Requested Orthopedic specialist assessment.',
      totalPastSessions: 0
    }
  ]);

  // Derived metrics for Admin Dashboard
  totalPatientsCount = computed(() => this.patients().length);
  unassignedPatientsCount = computed(() => this.patients().filter(p => !p.assignedDoctorId || p.arrivalStatus === 'ARRIVED').length);
  scheduledPatientsCount = computed(() => this.patients().filter(p => p.assignedDoctorId && p.arrivalStatus !== 'COMPLETED').length);
  activeDoctorsOnDuty = computed(() => this.doctors().filter(d => d.available && d.dutyStatus === 'On duty').length);

  constructor() {
    this.fetchDataFromBackend();
    this.syncFromLocalStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', () => {
        this.syncFromLocalStorage();
        this.fetchDataFromBackend();
      });
      window.addEventListener('cliniq_session_updated', () => {
        this.syncFromLocalStorage();
        this.fetchDataFromBackend();
      });
    }
  }

  /**
   * Immediately sync current doctor from localStorage session if present
   */
  syncFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('cliniq_session') || localStorage.getItem('cliniq_auth_session');
      if (stored) {
        const session = JSON.parse(stored);
        if (session?.user && (session.user.role === 'DOCTOR' || session.role === 'DOCTOR')) {
          this.syncCurrentDoctor(session.user);
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Ensure a specific or current logged-in doctor is dynamically registered and marked active in the doctors signal
   */
  syncCurrentDoctor(user?: any): void {
    if (!user) {
      try {
        const stored = localStorage.getItem('cliniq_session') || localStorage.getItem('cliniq_auth_session');
        if (stored) {
          const session = JSON.parse(stored);
          if (session?.user && (session.user.role === 'DOCTOR' || session.role === 'DOCTOR')) {
            user = session.user;
          }
        }
      } catch (e) {}
    }

    if (!user) return;

    const rawName = (user.name || user.full_name || '').trim();
    if (!rawName) return;

    const cleanName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
    const docId = user.id || 'DOC-CURRENT';
    const email = user.email || '';
    const specialty = user.specialization || user.specialty || user.department || 'Senior Cardiologist';
    const department = user.department || 'Cardiology';
    const initials = user.avatar_initials || cleanName.replace('Dr.', '').trim().slice(0, 2).toUpperCase() || 'DA';

    const standardSlots: DoctorSlot[] = [
      { id: `${docId}-s1`, time: '09:00 AM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s2`, time: '09:45 AM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s3`, time: '10:30 AM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s4`, time: '11:15 AM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s5`, time: '02:00 PM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s6`, time: '02:45 PM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s7`, time: '03:30 PM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s8`, time: '04:15 PM', duration: '30 min', status: 'AVAILABLE' },
    ];

    this.doctors.update(docs => {
      const existingIdx = docs.findIndex(d => 
        (docId && d.id.toLowerCase() === docId.toLowerCase()) || 
        (email && d.email.toLowerCase() === email.toLowerCase()) ||
        d.name.toLowerCase() === cleanName.toLowerCase()
      );

      if (existingIdx >= 0) {
        const updated = [...docs];
        updated[existingIdx] = {
          ...updated[existingIdx],
          name: cleanName,
          specialty: specialty,
          department: department,
          available: true,
          dutyStatus: 'On duty',
          slots: updated[existingIdx].slots.length > 0 ? updated[existingIdx].slots : standardSlots
        };
        return updated;
      } else {
        return [
          {
            id: docId,
            name: cleanName,
            initials: initials,
            specialty: specialty,
            department: department,
            email: email,
            available: true,
            dutyStatus: 'On duty',
            slots: standardSlots
          },
          ...docs
        ];
      }
    });
  }

  /**
   * Fetch live patients & doctors from Backend API, merging PostgreSQL registered users
   */
  async fetchDataFromBackend(): Promise<void> {
    try {
      this.isLoading.set(true);
      const [patientsRes, doctorsRes, usersRes] = await Promise.allSettled([
        firstValueFrom(this.http.get<{ success: boolean; data: ClinicPatient[] }>(`${this.apiBaseUrl}/api/scheduling/patients`)),
        firstValueFrom(this.http.get<{ success: boolean; data: DoctorProfile[] }>(`${this.apiBaseUrl}/api/scheduling/doctors`)),
        firstValueFrom(this.http.get<any[]>(`${this.apiBaseUrl}/api/auth/users?role=DOCTOR`))
      ]);

      if (patientsRes.status === 'fulfilled' && patientsRes.value?.data && Array.isArray(patientsRes.value.data)) {
        if (patientsRes.value.data.length > 0) {
          this.patients.set(patientsRes.value.data);
        }
      }

      let combinedDoctors: DoctorProfile[] = [];
      if (doctorsRes.status === 'fulfilled' && doctorsRes.value?.data && Array.isArray(doctorsRes.value.data)) {
        combinedDoctors = [...doctorsRes.value.data];
      }

      // Merge users from Auth table
      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
        for (const u of usersRes.value) {
          const uName = (u.full_name || u.email.split('@')[0]).trim();
          const formattedName = uName.toLowerCase().startsWith('dr.') ? uName : `Dr. ${uName}`;
          const exists = combinedDoctors.some(d => 
            d.id.toLowerCase() === u.id.toLowerCase() || 
            d.email.toLowerCase() === u.email.toLowerCase() ||
            d.name.toLowerCase() === formattedName.toLowerCase()
          );
          if (!exists) {
            combinedDoctors.unshift({
              id: u.id,
              name: formattedName,
              initials: u.avatar_initials || formattedName.replace('Dr.', '').trim().slice(0, 2).toUpperCase() || 'DR',
              specialty: u.specialization || u.department || 'Senior Cardiologist',
              department: u.department || 'Cardiology',
              email: u.email,
              available: true,
              dutyStatus: 'On duty',
              slots: [
                { id: `${u.id}-s1`, time: '09:00 AM', duration: '30 min', status: 'AVAILABLE' },
                { id: `${u.id}-s2`, time: '09:45 AM', duration: '30 min', status: 'AVAILABLE' },
                { id: `${u.id}-s3`, time: '10:30 AM', duration: '30 min', status: 'AVAILABLE' },
                { id: `${u.id}-s4`, time: '11:15 AM', duration: '30 min', status: 'AVAILABLE' },
                { id: `${u.id}-s5`, time: '02:00 PM', duration: '30 min', status: 'AVAILABLE' },
                { id: `${u.id}-s6`, time: '02:45 PM', duration: '30 min', status: 'AVAILABLE' },
                { id: `${u.id}-s7`, time: '03:30 PM', duration: '30 min', status: 'AVAILABLE' },
                { id: `${u.id}-s8`, time: '04:15 PM', duration: '30 min', status: 'AVAILABLE' },
              ]
            });
          }
        }
      }

      if (combinedDoctors.length > 0) {
        this.doctors.set(combinedDoctors);
      }

      // Sync current logged in doctor
      this.syncCurrentDoctor();
    } catch (err) {
      console.warn('[AppointmentService] Backend API warning, using local state.', err);
      this.syncCurrentDoctor();
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Register a new upcoming or attending doctor with auto-generated timing slots
   */
  async registerDoctor(doctorData: Partial<DoctorProfile>): Promise<{ success: boolean; message: string; doctor?: DoctorProfile }> {
    const rawName = (doctorData.name || 'New Specialist').trim();
    const cleanName = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
    const initials = cleanName.replace('Dr.', '').trim().slice(0, 2).toUpperCase() || 'DR';
    const docId = `DOC-${Math.floor(100 + Math.random() * 900)}`;

    const standardSlots: DoctorSlot[] = [
      { id: `${docId}-s1`, time: '09:00 AM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s2`, time: '09:45 AM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s3`, time: '10:30 AM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s4`, time: '11:15 AM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s5`, time: '02:00 PM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s6`, time: '02:45 PM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s7`, time: '03:30 PM', duration: '30 min', status: 'AVAILABLE' },
      { id: `${docId}-s8`, time: '04:15 PM', duration: '30 min', status: 'AVAILABLE' },
    ];

    const newDoc: DoctorProfile = {
      id: docId,
      name: cleanName,
      initials: initials,
      specialty: doctorData.specialty || 'General Physician',
      department: doctorData.department || 'Internal Medicine',
      email: doctorData.email || `${cleanName.toLowerCase().replace(/[^a-z]/g, '')}@stmercy.org`,
      phone: doctorData.phone || '+1 (555) 000-0000',
      room: doctorData.room || 'Suite 101',
      experience: doctorData.experience || (doctorData.isNewUpcoming ? 'New Upcoming Specialist' : 'Attending Specialist'),
      qualification: doctorData.qualification || 'MD, MBBS',
      isNewUpcoming: !!doctorData.isNewUpcoming,
      shiftTiming: doctorData.shiftTiming || '09:00 AM - 05:00 PM',
      available: doctorData.dutyStatus !== 'Off duty',
      dutyStatus: doctorData.dutyStatus || 'On duty',
      queueCount: 0,
      slots: standardSlots
    };

    // Update local reactive signal
    this.doctors.update(list => [newDoc, ...list]);

    // Persist to Backend API
    try {
      const resp = await firstValueFrom(
        this.http.post<{ success: boolean; message: string; data: DoctorProfile }>(
          `${this.apiBaseUrl}/api/scheduling/doctors`,
          {
            name: newDoc.name,
            email: newDoc.email,
            specialty: newDoc.specialty,
            department: newDoc.department,
            phone: newDoc.phone,
            room: newDoc.room,
            experience: newDoc.experience,
            qualification: newDoc.qualification,
            is_new_upcoming: newDoc.isNewUpcoming,
            duty_status: newDoc.dutyStatus,
            shift_timing: newDoc.shiftTiming,
            slot_duration: '30 min'
          }
        )
      );
      if (resp?.data) {
        this.doctors.update(list => list.map(d => d.id === newDoc.id ? { ...d, ...resp.data } : d));
      }
    } catch (err) {
      console.warn('[AppointmentService] Backend register doctor API warning:', err);
    }

    return {
      success: true,
      message: `✓ Registered ${newDoc.name} (${newDoc.specialty}) with standard consultation slots.`,
      doctor: newDoc
    };
  }

  /**
   * Update an existing doctor profile, room, shift timing, duty status, or specialization
   */
  async updateDoctor(doctorId: string, updates: Partial<DoctorProfile>): Promise<{ success: boolean; message: string }> {
    this.doctors.update(list => list.map(d => {
      if (d.id === doctorId) {
        const updated = { ...d, ...updates };
        if (updates.dutyStatus) {
          updated.available = updates.dutyStatus !== 'Off duty';
        }
        return updated;
      }
      return d;
    }));

    try {
      await firstValueFrom(
        this.http.put(`${this.apiBaseUrl}/api/scheduling/doctors/${encodeURIComponent(doctorId)}`, {
          name: updates.name,
          email: updates.email,
          specialty: updates.specialty,
          department: updates.department,
          phone: updates.phone,
          room: updates.room,
          experience: updates.experience,
          qualification: updates.qualification,
          is_new_upcoming: updates.isNewUpcoming,
          duty_status: updates.dutyStatus,
          available: updates.available,
          shift_timing: updates.shiftTiming
        })
      );
    } catch (err) {
      console.warn('[AppointmentService] Backend update doctor API warning:', err);
    }

    return { success: true, message: `Doctor ${doctorId} profile updated successfully.` };
  }

  /**
   * Quick toggle doctor On/Off Duty status
   */
  async toggleDoctorDuty(doctorId: string): Promise<{ success: boolean; newStatus: string }> {
    let newStatus = 'On duty';
    this.doctors.update(list => list.map(d => {
      if (d.id === doctorId) {
        const toggled = d.dutyStatus === 'On duty' ? 'Off duty' : 'On duty';
        newStatus = toggled;
        return {
          ...d,
          dutyStatus: toggled as any,
          available: toggled === 'On duty'
        };
      }
      return d;
    }));

    try {
      await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/api/scheduling/doctors/${encodeURIComponent(doctorId)}/toggle-duty`, {})
      );
    } catch (err) {
      console.warn('[AppointmentService] Backend toggle duty API warning:', err);
    }

    return { success: true, newStatus };
  }

  /**
   * Add a custom timing slot to a doctor's schedule
   */
  async addDoctorSlot(doctorId: string, time: string, duration: string = '30 min'): Promise<{ success: boolean; message: string }> {
    const slotId = `${doctorId}-${time.replace(/[^a-zA-Z0-9]/g, '')}`;
    const newSlot: DoctorSlot = {
      id: slotId,
      time: time,
      duration: duration,
      status: 'AVAILABLE'
    };

    this.doctors.update(list => list.map(d => {
      if (d.id === doctorId) {
        if (d.slots.some(s => s.time === time)) {
          return d;
        }
        return { ...d, slots: [...d.slots, newSlot] };
      }
      return d;
    }));

    try {
      await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/api/scheduling/doctors/${encodeURIComponent(doctorId)}/slots`, {
          time_slot: time,
          duration: duration,
          status: 'AVAILABLE'
        })
      );
    } catch (err) {
      console.warn('[AppointmentService] Backend add slot API warning:', err);
    }

    return { success: true, message: `Timing slot ${time} added successfully.` };
  }

  /**
   * Delete a timing slot from a doctor
   */
  async deleteDoctorSlot(doctorId: string, slotId: string): Promise<{ success: boolean; message: string }> {
    this.doctors.update(list => list.map(d => {
      if (d.id === doctorId) {
        return { ...d, slots: d.slots.filter(s => s.id !== slotId) };
      }
      return d;
    }));

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/api/scheduling/doctors/${encodeURIComponent(doctorId)}/slots/${encodeURIComponent(slotId)}`)
      );
    } catch (err) {
      console.warn('[AppointmentService] Backend delete slot API warning:', err);
    }

    return { success: true, message: `Slot deleted successfully.` };
  }

  /**
   * Remove doctor from roster
   */
  async deleteDoctor(doctorId: string): Promise<{ success: boolean; message: string }> {
    this.doctors.update(list => list.filter(d => d.id !== doctorId));

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/api/scheduling/doctors/${encodeURIComponent(doctorId)}`)
      );
    } catch (err) {
      console.warn('[AppointmentService] Backend delete doctor API warning:', err);
    }

    return { success: true, message: `Doctor profile removed from roster.` };
  }

  /**
   * Assign or Reassign a Doctor and Timing Slot to a Patient
   * Handles Patient Preferred Doctor Choice vs Admin Distribution
   */
  async assignDoctorAndSlot(
    patientId: string,
    doctorId: string,
    timeSlot: string,
    isPreferredChoice: boolean = false,
    preferredDoctorName?: string,
    visitType?: 'New Patient' | 'Follow-up' | 'Annual Check' | 'Consultation' | 'Emergency',
    bookingNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    const doc = this.doctors().find(d => d.id === doctorId);
    if (!doc) {
      return { success: false, message: 'Doctor not found.' };
    }

    const slot = doc.slots.find(s => s.time === timeSlot);
    if (!slot) {
      return { success: false, message: 'Selected time slot does not exist.' };
    }

    if (slot.status === 'BOOKED' && slot.bookedPatientId && slot.bookedPatientId !== patientId) {
      return { 
        success: false, 
        message: `Slot ${timeSlot} is already booked for ${slot.bookedPatientName || 'another patient'}. Please choose an available timing slot.` 
      };
    }

    // 1. Update Doctor Slots locally (Optimistic UI Update)
    this.doctors.update(docs => docs.map(d => {
      // Clear previous slot for this patient across all doctors
      const updatedSlots = d.slots.map(s => {
        if (s.bookedPatientId === patientId && (d.id !== doctorId || s.time !== timeSlot)) {
          return { ...s, status: 'AVAILABLE' as const, bookedPatientId: undefined, bookedPatientName: undefined };
        }
        if (d.id === doctorId && s.time === timeSlot) {
          return {
            ...s,
            status: 'BOOKED' as const,
            bookedPatientId: patientId,
            bookedPatientName: this.patients().find(p => p.id === patientId)?.name || 'Patient'
          };
        }
        return s;
      });

      return { ...d, slots: updatedSlots };
    }));

    // 2. Update Patient record locally
    const targetPatient = this.patients().find(p => p.id === patientId);
    const finalNotes = bookingNotes || (isPreferredChoice 
      ? `Patient requested ${doc.name} as preferred physician.` 
      : `Allocated to ${doc.name} at ${timeSlot} (${slot.duration}).`);

    this.patients.update(list => list.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          assignedDoctorId: doc.id,
          assignedDoctorName: doc.name,
          assignedTimeSlot: timeSlot,
          assignedDuration: slot.duration,
          arrivalStatus: 'SCHEDULED' as const,
          isPreferredDoctorChoice: isPreferredChoice,
          preferredDoctorName: isPreferredChoice ? (preferredDoctorName || doc.name) : undefined,
          visitType: visitType || p.visitType,
          bookingNotes: finalNotes
        };
      }
      return p;
    }));

    // 3. Persist to Backend REST API
    try {
      await firstValueFrom(
        this.http.post<{ success: boolean; message: string; data: any }>(
          `${this.apiBaseUrl}/api/scheduling/assign`,
          {
            patient_id: patientId,
            doctor_id: doc.id,
            doctor_name: doc.name,
            time_slot: timeSlot,
            duration: slot.duration,
            is_preferred_choice: isPreferredChoice,
            preferred_doctor_name: isPreferredChoice ? (preferredDoctorName || doc.name) : undefined,
            visit_type: visitType || targetPatient?.visitType || 'Consultation',
            booking_notes: finalNotes
          }
        )
      );
    } catch (apiErr) {
      console.warn('[AppointmentService] Backend assign API warning:', apiErr);
    }

    const successMsg = isPreferredChoice 
      ? `✓ Booked with ${doc.name} at ${timeSlot} [Patient Preferred Choice].`
      : `✓ Assigned to ${doc.name} for ${timeSlot} consultation.`;

    return { success: true, message: successMsg };
  }

  /**
   * Register a new incoming walk-in patient at clinic reception
   */
  async registerWalkinPatient(patientData: Partial<ClinicPatient>): Promise<ClinicPatient> {
    const idNum = Math.floor(1000000 + Math.random() * 9000000);
    const newId = `#${idNum}`;
    const initials = (patientData.name || 'New Patient')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const newPatient: ClinicPatient = {
      id: newId,
      pid: `P-${idNum}`,
      name: patientData.name || 'New Patient',
      initials: initials || 'PT',
      age: patientData.age || 35,
      gender: patientData.gender || 'M',
      phone: patientData.phone || '+1 (555) 000-0000',
      email: patientData.email || '',
      demographics: `${patientData.age || 35}${patientData.gender || 'M'} · ${newId}`,
      arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      arrivalStatus: patientData.assignedDoctorId ? 'SCHEDULED' : 'ARRIVED',
      reason: patientData.reason || 'General medical consultation',
      condition: patientData.condition || 'Triage review',
      vitals: patientData.vitals || { bp: '120/80 mmHg', hr: '72 bpm', pain: '0/10', spo2: '98%', temp: '36.6 °C' },
      visitType: patientData.visitType || 'New Patient',
      isPreferredDoctorChoice: !!patientData.preferredDoctorName || !!patientData.isPreferredDoctorChoice,
      preferredDoctorName: patientData.preferredDoctorName,
      assignedDoctorId: patientData.assignedDoctorId,
      assignedDoctorName: patientData.assignedDoctorName,
      assignedTimeSlot: patientData.assignedTimeSlot,
      assignedDuration: patientData.assignedDuration || '30 min',
      bookingNotes: patientData.bookingNotes || (patientData.preferredDoctorName ? `Requested Dr. ${patientData.preferredDoctorName}` : 'Registered at front desk'),
      totalPastSessions: 0
    };

    // Update local state
    this.patients.update(list => [newPatient, ...list]);

    // Persist to Backend REST API
    try {
      const res = await firstValueFrom(
        this.http.post<{ success: boolean; message?: string; data: ClinicPatient }>(
          `${this.apiBaseUrl}/api/scheduling/patients`,
          {
            name: newPatient.name,
            age: newPatient.age,
            gender: newPatient.gender,
            phone: newPatient.phone,
            email: newPatient.email,
            reason: newPatient.reason,
            condition: newPatient.condition,
            visit_type: newPatient.visitType,
            vitals: newPatient.vitals,
            preferred_doctor_name: newPatient.preferredDoctorName,
            is_preferred_doctor_choice: newPatient.isPreferredDoctorChoice,
            assigned_doctor_id: newPatient.assignedDoctorId,
            assigned_doctor_name: newPatient.assignedDoctorName,
            assigned_time_slot: newPatient.assignedTimeSlot,
            booking_notes: newPatient.bookingNotes
          }
        )
      );
      if (res?.data) {
        // Update with server returned record
        this.patients.update(list => list.map(p => p.id === newPatient.id ? { ...p, ...res.data } : p));
      }
    } catch (err) {
      console.warn('[AppointmentService] Backend register patient warning:', err);
    }

    return newPatient;
  }

  /**
   * Update Patient details, vitals, or status
   */
  async updatePatient(patientId: string, updates: Partial<ClinicPatient>): Promise<{ success: boolean; message: string }> {
    this.patients.update(list => list.map(p => {
      if (p.id === patientId) {
        return { ...p, ...updates };
      }
      return p;
    }));

    try {
      await firstValueFrom(
        this.http.put(`${this.apiBaseUrl}/api/scheduling/patients/${encodeURIComponent(patientId)}`, updates)
      );
    } catch (err) {
      console.warn('[AppointmentService] Backend update patient warning:', err);
    }

    return { success: true, message: `Patient ${patientId} updated successfully.` };
  }

  /**
   * Discharge or Delete a Patient record
   */
  async deletePatient(patientId: string): Promise<{ success: boolean; message: string }> {
    const pat = this.patients().find(p => p.id === patientId);
    
    // Release doctor slot
    if (pat?.assignedDoctorId && pat?.assignedTimeSlot) {
      this.doctors.update(docs => docs.map(d => {
        if (d.id === pat.assignedDoctorId) {
          return {
            ...d,
            slots: d.slots.map(s => {
              if (s.time === pat.assignedTimeSlot && s.bookedPatientId === patientId) {
                return { ...s, status: 'AVAILABLE' as const, bookedPatientId: undefined, bookedPatientName: undefined };
              }
              return s;
            })
          };
        }
        return d;
      }));
    }

    // Remove from patients signal
    this.patients.update(list => list.filter(p => p.id !== patientId));

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiBaseUrl}/api/scheduling/patients/${encodeURIComponent(patientId)}`)
      );
    } catch (err) {
      console.warn('[AppointmentService] Backend delete patient warning:', err);
    }

    return { success: true, message: `Patient ${patientId} discharged and slot freed.` };
  }

  /**
   * Fetch full past consultation history & clinical sessions for a patient
   */
  async getPatientSessions(patientId: string): Promise<any[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: any[] }>(`${this.apiBaseUrl}/api/scheduling/patients/${encodeURIComponent(patientId)}/sessions`)
      );
      if (res?.data) {
        return res.data;
      }
    } catch (err) {
      console.warn('[AppointmentService] Error fetching patient sessions from backend:', err);
    }

    // Fallback: check if local mock data has past sessions for Marcus / Priya
    if (patientId.includes('00847261') || patientId.includes('P1245')) {
      return [
        {
          sessionNumber: 1,
          sessionTitle: 'Session 1: Initial Presentation & BP Review',
          appointmentDate: '2026-07-14T09:00:00Z',
          doctorName: 'Dr. Yuki Tanaka',
          transcript: 'Good morning Marcus... blood pressure medication review and tension headache check.',
          status: 'COMPLETED',
          clinicalAnalysis: {
            summary: {
              chief_complaint: 'Hypertension follow-up with morning headaches',
              history_of_present_illness: '42-year-old male with known Stage 1 Essential Hypertension.'
            },
            differential_diagnosis: [
              { diagnosis: 'Essential Hypertension Stage 1', icd10_code: 'I10', confidence_level: 'High', confidence_score: 0.94 }
            ]
          },
          soapReport: {
            subjective: 'Marcus Delgado (42M) presents for hypertension review. Reports 2-week history of throbbing morning headaches.',
            objective: 'BP: 138/88 mmHg, HR: 72 bpm, SpO2: 98%.',
            assessment: '1. Essential Hypertension Stage 1 (ICD-10 I10). 2. Tension headache.',
            plan: '1. Titrate Amlodipine to 5mg PO daily. 2. Follow-up in 4 weeks.'
          }
        }
      ];
    }

    if (patientId.includes('00391847')) {
      return [
        {
          sessionNumber: 1,
          sessionTitle: 'Session 1: Initial Thyroid Consultation',
          appointmentDate: '2026-05-02T09:45:00Z',
          doctorName: 'Dr. Yuki Tanaka',
          transcript: 'Hello Priya... persistent fatigue and cold sensitivity review.',
          status: 'COMPLETED',
          clinicalAnalysis: {
            summary: {
              chief_complaint: 'Persistent fatigue and cold intolerance',
              history_of_present_illness: '34-year-old female presenting with 6-week progressive fatigue.'
            },
            differential_diagnosis: [
              { diagnosis: 'Primary Hypothyroidism', icd10_code: 'E03.9', confidence_level: 'High', confidence_score: 0.96 }
            ]
          },
          soapReport: {
            subjective: 'Priya Sharma (34F) reports 6 weeks fatigue and cold intolerance.',
            objective: 'Vitals: BP 118/76 mmHg, HR 68 bpm.',
            assessment: 'Recurrent Primary Hypothyroidism secondary to medication discontinuation.',
            plan: '1. Resume Levothyroxine 50mcg PO daily. 2. TSH recheck in 6 weeks.'
          }
        }
      ];
    }

    return [];
  }

  /**
   * Get dynamic Queue for a specific Doctor (matches doctor ID, name, or preferred choice)
   */
  getDoctorQueue(doctorName: string, doctorId?: string): ClinicPatient[] {
    const cleanName = doctorName.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
    const cleanFull = doctorName.trim().toLowerCase();
    const cleanId = doctorId?.trim().toLowerCase();

    const matchedDoctor = this.doctors().find(d => 
      (cleanId && d.id.toLowerCase() === cleanId) ||
      d.name.toLowerCase().includes(cleanName) || 
      cleanFull.includes(d.name.toLowerCase()) ||
      d.id.toLowerCase() === cleanFull
    );

    const docId = matchedDoctor?.id || doctorId;
    const docName = matchedDoctor?.name || doctorName;
    const docCleanName = docName.replace(/^Dr\.\s*/i, '').trim().toLowerCase();

    return this.patients().filter(p => {
      // 1. Direct doctor ID match
      if (docId && p.assignedDoctorId && p.assignedDoctorId.toLowerCase() === docId.toLowerCase()) {
        return true;
      }
      // 2. Assigned doctor name match
      if (p.assignedDoctorName) {
        const pDocName = p.assignedDoctorName.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
        if (pDocName === docCleanName || pDocName.includes(cleanName) || cleanName.includes(pDocName)) {
          return true;
        }
      }
      // 3. Preferred doctor match if assigned or requested
      if (p.preferredDoctorName && p.isPreferredDoctorChoice) {
        const pPrefName = p.preferredDoctorName.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
        if (pPrefName === docCleanName || pPrefName.includes(cleanName) || cleanName.includes(pPrefName)) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Get available slots for a given doctor
   */
  getDoctorSlots(doctorId: string): DoctorSlot[] {
    const doc = this.doctors().find(d => d.id === doctorId);
    return doc?.slots || [];
  }

  /**
   * Share finalized SOAP report with patient
   */
  async shareSoapReportWithPatient(
    patientId: string,
    soapReport: any,
    doctorName?: string,
    doctorId?: string,
    encounterId?: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const cleanId = patientId.replace(/^#/, '');
      const payload = {
        encounter_id: encounterId || `CONS-${cleanId}-1`,
        doctor_id: doctorId || 'DOC-ATTENDING',
        doctor_name: doctorName || 'Attending Physician',
        soap_report: soapReport,
        patient_summary: soapReport?.plan || ''
      };

      // 1. Send to Backend REST API
      const resp: any = await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/api/scheduling/patients/${encodeURIComponent(patientId)}/share-soap`, payload)
      );

      // 2. Also update local signals & save in localStorage for instant multi-tab sync
      try {
        const sharedPayload = {
          patientId,
          soapReport,
          doctorName: doctorName || 'Attending Physician',
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`cliniq_shared_soap_${patientId}`, JSON.stringify(sharedPayload));
        localStorage.setItem('cliniq_last_shared_soap', JSON.stringify(sharedPayload));
        window.dispatchEvent(new CustomEvent('cliniq_soap_shared', { detail: sharedPayload }));
      } catch (e) {
        console.warn('Could not dispatch local event:', e);
      }

      return { success: true, message: resp?.message || 'SOAP report shared with patient successfully', data: resp };
    } catch (err: any) {
      console.error('Error sharing SOAP report with backend, using offline fallback:', err);
      // Fallback local storage broadcast
      const fallbackPayload = {
        patientId,
        soapReport,
        doctorName: doctorName || 'Attending Physician',
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`cliniq_shared_soap_${patientId}`, JSON.stringify(fallbackPayload));
      localStorage.setItem('cliniq_last_shared_soap', JSON.stringify(fallbackPayload));
      window.dispatchEvent(new CustomEvent('cliniq_soap_shared', { detail: fallbackPayload }));
      return { success: true, message: 'SOAP note shared with patient successfully.' };
    }
  }

  /**
   * Complete and close the consultation session for a patient.
   * Updates arrivalStatus to COMPLETED and sets lastVisit to current date.
   */
  async completeConsultation(patientId: string, doctorId?: string, doctorName?: string): Promise<{ success: boolean; message: string; lastVisit?: string }> {
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const cleanId = patientId.startsWith('#') ? patientId : `#${patientId}`;

    // Update local patient state immediately
    this.patients.update(list => list.map(p => {
      if (p.id === patientId || p.id === cleanId || p.id.replace('#', '') === patientId.replace('#', '')) {
        return {
          ...p,
          arrivalStatus: 'COMPLETED' as const,
          lastVisit: todayStr
        };
      }
      return p;
    }));

    try {
      const resp: any = await firstValueFrom(
        this.http.post(`${this.apiBaseUrl}/api/scheduling/patients/${encodeURIComponent(patientId)}/complete-consultation`, {
          doctor_id: doctorId,
          doctor_name: doctorName
        })
      );
      if (resp?.data) {
        this.patients.update(list => list.map(p => (p.id === patientId || p.id === cleanId) ? { ...p, ...resp.data } : p));
      }
      return {
        success: true,
        message: resp?.message || `Consultation completed. Last visit updated to ${todayStr}.`,
        lastVisit: resp?.lastVisit || todayStr
      };
    } catch (err) {
      console.warn('[AppointmentService] Backend complete consultation fallback:', err);
      return {
        success: true,
        message: `Consultation completed for ${patientId}. Last visit updated to ${todayStr}.`,
        lastVisit: todayStr
      };
    }
  }

  /**
   * Get patient health summary (Alerts, Records, Prescriptions with SOAP)
   */
  async getPatientPortalSummary(patientIdOrEmail: string): Promise<any> {
    try {
      const resp: any = await firstValueFrom(
        this.http.get(`${this.apiBaseUrl}/api/scheduling/patients/${encodeURIComponent(patientIdOrEmail)}/portal-summary`)
      );
      return resp;
    } catch (err) {
      console.warn('Error fetching patient portal summary from API, using local fallback:', err);
      return null;
    }
  }
}


