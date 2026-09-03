import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../core/services/mock-data.service';
import { AuthService } from '../../../core/services/auth.service';
import { RecordingService } from '../../../core/services/recording.service';

@Component({
  selector: 'app-transcript-ready',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transcript-ready.component.html',
  styleUrls: ['./transcript-ready.component.scss']
})
export class TranscriptReadyComponent {
  mockData = inject(MockDataService);
  authService = inject(AuthService);
  recordingService = inject(RecordingService);

  activeTab: 'Transcript' | 'Details' = 'Transcript';

  get consultation() {
    return this.mockData.activeConsultation();
  }

  get gdriveLink(): string | null {
    return this.recordingService.gdriveWebViewLink();
  }

  generateSoap() {
    this.authService.setStep(5); // Advance to Generate SOAP & Prescription (Step 5)
  }
}
