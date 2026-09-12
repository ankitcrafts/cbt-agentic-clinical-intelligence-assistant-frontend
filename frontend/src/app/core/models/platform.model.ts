export type UserRole = 'ADMIN' | 'DOCTOR' | 'PATIENT';

export interface UserProfile {
  id?: string;
  email: string;
  full_name?: string;
  name?: string;
  role: UserRole;
  department?: string;
  specialization?: string;
  designation?: string;
  phone_number?: string;
  avatar_initials?: string;
  is_active?: boolean;
  is_profile_completed?: boolean;
}

export interface SendOTPResponse {
  success: boolean;
  message: string;
  email: string;
  role: string;
  expires_in_seconds: number;
  dev_otp?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  access_token: string;
  token_type: string;
  user: UserProfile;
  target_dashboard_url: string;
  is_new_user?: boolean;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  email: string;
  status: 'Active' | 'Inactive';
  avatar?: string;
}

export interface Patient {
  id: string;
  pid: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  status: 'Active' | 'Inactive';
  avatar?: string;
}

export interface Recording {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  date: string;
  duration: string;
  status: 'Processed' | 'Processing' | 'Failed';
  audioUrl?: string;
}

export interface ScheduleItem {
  time: string;
  patientName: string;
  type: string;
  status: 'Consultation' | 'Follow-up' | 'Completed' | 'Pending';
}

export interface TranscriptTurn {
  speaker: 'Doctor' | 'Patient';
  text: string;
  timestamp: string;
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  medications: Medication[];
  advice: string[];
}

export interface ConsultationDetails {
  id: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPid: string;
  doctorName: string;
  doctorSpecialization: string;
  date: string;
  duration: string;
  status: 'Completed' | 'Processing' | 'Pending';
  reasonForVisit: string;
  transcript: TranscriptTurn[];
  soapNote: SoapNote;
  prescription: Prescription;
  wordCount: number;
}
