import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../../core/services/mock-data.service';

@Component({
  selector: 'app-recordings-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recordings-reports.component.html',
  styleUrls: ['./recordings-reports.component.scss']
})
export class RecordingsReportsComponent {
  mockData = inject(MockDataService);
  activeTab: 'Recordings' | 'Reports' = 'Recordings';
  searchTerm = '';

  get filteredRecordings() {
    return this.mockData.recordings().filter(rec =>
      rec.patientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      rec.doctorName.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
