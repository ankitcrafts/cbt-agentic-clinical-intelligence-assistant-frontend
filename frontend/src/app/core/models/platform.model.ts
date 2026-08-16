export type UserRole = 'ADMIN' | 'DOCTOR' | 'PATIENT';

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
