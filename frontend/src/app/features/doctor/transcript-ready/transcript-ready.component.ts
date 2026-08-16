import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../core/services/mock-data.service';
import { AuthService } from '../../../core/services/auth.service';

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

  activeTab: 'Transcript' | 'Details' = 'Transcript';

  get consultation() {
    return this.mockData.activeConsultation();
  }

  generateSoap() {
    this.authService.setStep(5); // Advance to Generate SOAP & Prescription (Step 5)
  }
}
