import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../core/services/mock-data.service';

@Component({
  selector: 'app-view-prescription',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-prescription.component.html',
  styleUrls: ['./view-prescription.component.scss']
})
export class ViewPrescriptionComponent {
  mockData = inject(MockDataService);

  get consultation() {
    return this.mockData.activeConsultation();
  }
}
