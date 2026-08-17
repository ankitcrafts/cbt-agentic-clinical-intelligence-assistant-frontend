import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { RecordingService } from '../../../core/services/recording.service';

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
  recordingService = inject(RecordingService);

  @ViewChild('audioPlayer') audioPlayerRef?: ElementRef<HTMLAudioElement>;

  isPlayingPreview = false;
  waveformBars = Array(28).fill(0);

  ngOnInit() {}

  ngOnDestroy() {
    if (this.recordingService.state() === 'RECORDING' || this.recordingService.state() === 'PAUSED') {
      this.recordingService.stopRecording();
    } else {
      this.recordingService.stopMicrophoneTracks();
    }
  }

  async startRecording(): Promise<void> {
    try {
      const activeCons = this.mockData.activeConsultation();
      await this.recordingService.startRecording({
        encounterId: activeCons.id || 'CONS-41233',
        doctorId: 'DOC-001',
        patientId: activeCons.patientPid || 'P1245'
      });
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  }

  togglePause() {
    if (this.recordingService.state() === 'RECORDING') {
      this.recordingService.pauseRecording();
    } else if (this.recordingService.state() === 'PAUSED') {
      this.recordingService.resumeRecording();
    } else if (this.recordingService.state() === 'IDLE') {
      this.startRecording();
    }
  }

  async stopRecording(): Promise<void> {
    const activeCons = this.mockData.activeConsultation();
    await this.recordingService.stopRecording({
      encounterId: activeCons.id || 'CONS-41233',
      doctorId: 'DOC-001',
      patientId: activeCons.patientPid || 'P1245'
    });
  }

  async finishRecording() {
    if (this.recordingService.state() === 'RECORDING' || this.recordingService.state() === 'PAUSED') {
      await this.stopRecording();
    }
    if (this.recordingService.state() === 'READY_TO_UPLOAD') {
      this.uploadAndAdvance();
    } else {
      this.authService.setStep(3); // Advance to Processing (Step 3)
    }
  }

  uploadAndAdvance() {
    const activeCons = this.mockData.activeConsultation();
    this.recordingService.uploadRecording({
      encounterId: activeCons.id || 'CONS-41233',
      doctorId: 'DOC-001',
      patientId: activeCons.patientPid || 'P1245'
    }).subscribe({
      next: () => {
        this.authService.setStep(3); // Advance to Processing (Step 3)
      },
      error: (err) => {
        console.error('Upload failed:', err);
      }
    });
  }

  togglePreviewPlayback(): void {
    const audioEl = this.audioPlayerRef?.nativeElement;
    if (!audioEl) return;

    if (this.isPlayingPreview) {
      audioEl.pause();
      this.isPlayingPreview = false;
    } else {
      audioEl.play().then(() => {
        this.isPlayingPreview = true;
      }).catch(err => {
        console.error('Playback error:', err);
      });
    }
  }

  onAudioEnded(): void {
    this.isPlayingPreview = false;
  }

  downloadRecording(): void {
    this.recordingService.downloadRecording();
  }

  setAudioFormat(format: 'wav' | 'mp3' | 'webm'): void {
    this.recordingService.setTargetFormat(format);
  }


  get currentState() {
    return this.recordingService.state();
  }

  get formattedTime(): string {
    return this.recordingService.formatDuration(this.recordingService.durationSeconds());
  }

  get isPaused(): boolean {
    return this.currentState === 'PAUSED';
  }
}
