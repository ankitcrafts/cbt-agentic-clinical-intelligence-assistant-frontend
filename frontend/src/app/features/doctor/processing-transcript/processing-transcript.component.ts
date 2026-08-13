import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-processing-transcript',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './processing-transcript.component.html',
  styleUrls: ['./processing-transcript.component.scss']
})
export class ProcessingTranscriptComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);

  progress = 72;
  timer: any;

  steps = [
    { title: 'Audio uploaded', status: 'Completed' },
    { title: 'Audio processing', status: 'Completed' },
    { title: 'Speech to text (ASR)', status: 'In-Progress' },
    { title: 'Transcript formatting', status: 'Pending' },
    { title: 'Saving transcript', status: 'Pending' },
    { title: 'Generating summary', status: 'Pending' }
  ];

  ngOnInit() {
    this.timer = setInterval(() => {
      if (this.progress < 100) {
        this.progress += 4;
        if (this.progress >= 85) {
          this.steps[2].status = 'Completed';
          this.steps[3].status = 'In-Progress';
        }
        if (this.progress >= 95) {
          this.steps[3].status = 'Completed';
          this.steps[4].status = 'Completed';
          this.steps[5].status = 'Completed';
        }
      } else {
        clearInterval(this.timer);
        setTimeout(() => {
          this.authService.setStep(4); // Advance to Transcript Ready (Step 4)
        }, 800);
      }
    }, 400);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  skipProcessing() {
    this.authService.setStep(4);
  }
}
