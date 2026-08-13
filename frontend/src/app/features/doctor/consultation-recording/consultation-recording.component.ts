import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { MockDataService } from '../../../core/services/mock-data.service';

@Component({
  selector: 'app-consultation-recording',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consultation-recording.component.html',
  styleUrls: ['./consultation-recording.component.scss']
})
export class ConsultationRecordingComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  mockData = inject(MockDataService);

  seconds = 18;
  isPaused = false;
  timerInterval: any;

  waveformBars = Array(28).fill(0);

  ngOnInit() {
    this.startTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.seconds++;
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
  }

  get formattedTime(): string {
    const mins = Math.floor(this.seconds / 60);
    const secs = this.seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  finishRecording() {
    this.stopTimer();
    this.authService.setStep(3); // Moves to Processing & Transcript Generation (Step 3)
  }
}
