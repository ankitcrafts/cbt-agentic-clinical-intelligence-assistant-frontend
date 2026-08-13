import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../core/services/mock-data.service';

@Component({
  selector: 'app-soap-prescription',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './soap-prescription.component.html',
  styleUrls: ['./soap-prescription.component.scss']
})
export class SoapPrescriptionComponent {
  mockData = inject(MockDataService);
  activeTab: 'SOAP' | 'Prescription' = 'SOAP';
  sentToast = false;

  get consultation() {
    return this.mockData.activeConsultation();
  }

  sendToPatient() {
    this.sentToast = true;
    setTimeout(() => {
      this.sentToast = false;
    }, 3000);
  }
}
