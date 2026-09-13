import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { MockDataService } from '../../../core/services/mock-data.service';

@Component({
  selector: 'app-recordings-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recordings-reports.component.html',
  styleUrls: ['./recordings-reports.component.scss']
})
export class RecordingsReportsComponent {
  authService = inject(AuthService);
  mockData = inject(MockDataService);
  activeTab: 'Recordings' | 'Reports' = 'Recordings';
  searchTerm = '';

  goBackToDashboard(): void {
    this.authService.currentStep.set(1);
  }

  get filteredRecordings() {
    return this.mockData.recordings().filter(rec =>
      rec.patientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      rec.doctorName.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
