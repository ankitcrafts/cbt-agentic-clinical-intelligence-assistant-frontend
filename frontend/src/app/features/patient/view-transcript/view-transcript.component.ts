import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../core/services/mock-data.service';

@Component({
  selector: 'app-view-transcript',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-transcript.component.html',
  styleUrls: ['./view-transcript.component.scss']
})
export class ViewTranscriptComponent {
  mockData = inject(MockDataService);
  activeTab: 'Transcript' | 'Summary' = 'Transcript';

  get consultation() {
    return this.mockData.activeConsultation();
  }
}
