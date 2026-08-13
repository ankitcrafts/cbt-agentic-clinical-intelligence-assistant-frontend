import { Injectable, signal } from '@angular/core';
import { Doctor, Patient, Recording, ScheduleItem, ConsultationDetails } from '../models/platform.model';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  // Admin Mock Data
  doctors = signal<Doctor[]>([
    { id: '1', name: 'Dr. Rahul Sharma', specialization: 'Cardiologist', email: 'rahul@hospital.com', status: 'Active' },
    { id: '2', name: 'Dr. Neha Verma', specialization: 'Neurologist', email: 'neha@hospital.com', status: 'Active' },
    { id: '3', name: 'Dr. Amit Patel', specialization: 'Orthopedic', email: 'amit@hospital.com', status: 'Active' },
    { id: '4', name: 'Dr. Sneha Iyer', specialization: 'Pediatrician', email: 'sneha@hospital.com', status: 'Inactive' },
    { id: '5', name: 'Dr. Vikram Singh', specialization: 'General Physician', email: 'vikram@hospital.com', status: 'Active' }
  ]);

  patients = signal<Patient[]>([
    { id: 'P1245', pid: 'P1245', name: 'Priya Verma', age: 32, gender: 'Female', phone: '9876543210', status: 'Active' },
    { id: 'P1246', pid: 'P1246', name: 'Rohan Mehta', age: 45, gender: 'Male', phone: '9876543211', status: 'Active' },
    { id: 'P1247', pid: 'P1247', name: 'Ananya Singh', age: 28, gender: 'Female', phone: '9876543212', status: 'Active' },
    { id: 'P1248', pid: 'P1248', name: 'Suresh Kumar', age: 55, gender: 'Male', phone: '9876543213', status: 'Inactive' },
    { id: 'P1249', pid: 'P1249', name: 'Meera Joshi', age: 38, gender: 'Female', phone: '9876543214', status: 'Active' }
  ]);

  recordings = signal<Recording[]>([
    { id: 'REC-101', patientName: 'Priya Verma', patientId: 'P1245', doctorName: 'Dr. Rahul Sharma', date: '09 May 2026', duration: '12:45', status: 'Processed' },
    { id: 'REC-102', patientName: 'Rohan Mehta', patientId: 'P1246', doctorName: 'Dr. Neha Verma', date: '09 May 2026', duration: '08:30', status: 'Processed' },
    { id: 'REC-103', patientName: 'Ananya Singh', patientId: 'P1247', doctorName: 'Dr. Amit Patel', date: '08 May 2026', duration: '15:20', status: 'Processing' },
    { id: 'REC-104', patientName: 'Suresh Kumar', patientId: 'P1248', doctorName: 'Dr. Rahul Sharma', date: '08 May 2026', duration: '10:15', status: 'Processed' },
    { id: 'REC-105', patientName: 'Meera Joshi', patientId: 'P1249', doctorName: 'Dr. Sneha Iyer', date: '08 May 2026', duration: '11:05', status: 'Processed' }
  ]);

  doctorSchedule = signal<ScheduleItem[]>([
    { time: '09:30 AM', patientName: 'Priya Verma', type: 'Consultation', status: 'Consultation' },
    { time: '10:30 AM', patientName: 'Rohan Mehta', type: 'Consultation', status: 'Consultation' },
    { time: '11:00 AM', patientName: 'Ananya Singh', type: 'Consultation', status: 'Consultation' },
    { time: '12:00 PM', patientName: 'Suresh Kumar', type: 'Follow-up', status: 'Follow-up' }
  ]);

  activeConsultation = signal<ConsultationDetails>({
    id: 'CONS-41233',
    patientName: 'Priya Verma',
    patientAge: 32,
    patientGender: 'Female',
    patientPid: 'P1245',
    doctorName: 'Dr. Rahul Sharma',
    doctorSpecialization: 'Cardiologist',
    date: '09 May 2026',
    duration: '12:45',
    status: 'Completed',
    reasonForVisit: 'Headache, dizziness and neck pain',
    wordCount: 2245,
    transcript: [
      { speaker: 'Doctor', text: 'Good morning Priya, how are you feeling today?', timestamp: '00:05' },
      { speaker: 'Patient', text: 'Good morning doctor. I have been having headache and dizziness since last 3 days.', timestamp: '00:18' },
      { speaker: 'Doctor', text: 'Do you have any fever or cold?', timestamp: '00:35' },
      { speaker: 'Patient', text: 'No fever, but I feel tired and have some neck pain.', timestamp: '00:48' },
      { speaker: 'Doctor', text: 'Any past medical history?', timestamp: '01:10' },
      { speaker: 'Patient', text: 'No major issues.', timestamp: '01:22' },
      { speaker: 'Doctor', text: 'Okay, let me check your BP.', timestamp: '01:35' }
    ],
    soapNote: {
      subjective: 'Patient has headache, dizziness and neck pain since last 3 days.',
      objective: 'BP: 120/80 mmHg, Temp: Normal',
      assessment: 'Tension headache',
      plan: 'Rest, hydration, regular sleep, medication. Follow-up after 5 days.'
    },
    prescription: {
      medications: [
        { name: 'Paracetamol 500mg', dosage: '1 tablet after food', frequency: 'Twice a day', duration: '5 Days' },
        { name: 'Cinnerizine 25mg', dosage: '1 tablet at night', frequency: 'Once a day', duration: '5 Days' },
        { name: 'Diclofenac Gel', dosage: 'Apply on neck', frequency: 'If pain', duration: 'As needed' }
      ],
      advice: [
        'Take sufficient rest',
        'Drink plenty of water',
        'Avoid stress and screen time'
      ]
    }
  });

  adminStats = signal({
    doctorsCount: 48,
    patientsCount: 1245,
    recordingsCount: 2356,
    reportsCount: 1897
  });

  doctorStats = signal({
    todaysConsultations: 12,
    recordings: 8,
    reportsGenerated: 15,
    pendingReports: 3
  });

  patientStats = signal({
    totalConsultations: 6,
    reports: 5,
    prescriptions: 5,
    upcoming: 1
  });
}
