import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent {
  authService = inject(AuthService);

  isPlaying = false;
  currentTime = '11:36';
  totalTime = '18:42';

  visitDetails = {
    patientName: 'Marcus Delgado',
    visitId: '#2026-08-13',
    reason: 'Cardiology follow-up',
    date: 'Aug 13, 2026',
    time: '09:14 AM',
    duration: '18 min 42 sec'
  };

  transcriptExchanges = [
    {
      id: 1,
      speaker: 'YT',
      speakerName: 'Dr. Yuki Tanaka',
      isDoctor: true,
      text: 'Good morning, Marcus. How have you been feeling since our last visit?'
    },
    {
      id: 2,
      speaker: 'MD',
      speakerName: 'Marcus Delgado',
      isDoctor: false,
      text: "Mostly okay, but I've been getting these headaches in the afternoon. Usually around 2 or 3pm."
    },
    {
      id: 3,
      speaker: 'YT',
      speakerName: 'Dr. Yuki Tanaka',
      isDoctor: true,
      text: 'How often are these headaches occurring? Daily, a few times a week?'
    },
    {
      id: 4,
      speaker: 'MD',
      speakerName: 'Marcus Delgado',
      isDoctor: false,
      text: 'Maybe four or five times a week. They last about an hour.'
    },
    {
      id: 5,
      speaker: 'YT',
      speakerName: 'Dr. Yuki Tanaka',
      isDoctor: true,
      text: 'On a scale of 1 to 10, how would you rate the pain?'
    },
    {
      id: 6,
      speaker: 'MD',
      speakerName: 'Marcus Delgado',
      isDoctor: false,
      text: 'Maybe a 5 or 6. Uncomfortable but I can still work through them.'
    },
    {
      id: 7,
      speaker: 'YT',
      speakerName: 'Dr. Yuki Tanaka',
      isDoctor: true,
      text: 'Have you noticed any specific pattern or triggers before they start?'
    },
    {
      id: 8,
      speaker: 'MD',
      speakerName: 'Marcus Delgado',
      isDoctor: false,
      text: 'Not really, though I do tend to drink coffee around noon.'
    }
  ];

  aiQuestions = [
    {
      id: 1,
      priority: 'high',
      priorityLabel: 'high',
      tag: 'SYMPTOM DETAIL',
      question: 'Ask about location and quality of headache — tension vs. vascular patterns differ in management.'
    },
    {
      id: 2,
      priority: 'high',
      priorityLabel: 'high',
      tag: 'DIFFERENTIAL',
      question: 'Has the patient noticed any visual disturbances or aura before onset? Important to rule out migraine.'
    },
    {
      id: 3,
      priority: 'medium',
      priorityLabel: 'medium',
      tag: 'LIFESTYLE',
      question: 'Screen for caffeine intake — afternoon timing correlates with caffeine withdrawal in regular coffee drinkers.'
    },
    {
      id: 4,
      priority: 'medium',
      priorityLabel: 'medium',
      tag: 'LIFESTYLE',
      question: 'Assess sleep quality and duration — headaches at consistent times can indicate disrupted sleep cycles.'
    },
    {
      id: 5,
      priority: 'low',
      priorityLabel: 'low',
      tag: 'ENVIRONMENT',
      question: 'Consider asking about workplace ergonomics — screen time and posture are common triggers.'
    }
  ];

  patientSnapshot = {
    condition: 'Hypertension Stage 1',
    currentRx: 'Lisinopril 10mg, Atorvastatin 20mg',
    lastVisit: 'July 14, 2026',
    bpAtLastVisit: '138/88 mmHg',
    nextFollowUp: 'Aug 25, 2026'
  };

  togglePlay() {
    this.isPlaying = !this.isPlaying;
  }

  dismissQuestion(id: number) {
    this.aiQuestions = this.aiQuestions.filter(q => q.id !== id);
  }
}
