import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../core/services/mock-data.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-consultation-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consultation-details.component.html',
  styleUrls: ['./consultation-details.component.scss']
})
export class ConsultationDetailsComponent {
  mockData = inject(MockDataService);
  authService = inject(AuthService);

  isPlaying = false;

  get consultation() {
    return this.mockData.activeConsultation();
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
  }

  goToStep(step: number) {
    this.authService.setStep(step);
  }
}
