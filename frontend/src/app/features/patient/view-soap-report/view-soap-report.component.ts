import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../core/services/mock-data.service';

@Component({
  selector: 'app-view-soap-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-soap-report.component.html',
  styleUrls: ['./view-soap-report.component.scss']
})
export class ViewSoapReportComponent {
  mockData = inject(MockDataService);

  get consultation() {
    return this.mockData.activeConsultation();
  }
}
