import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../core/services/mock-data.service';
import { PdfExportService } from '../../../core/services/pdf-export.service';

@Component({
  selector: 'app-view-soap-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-soap-report.component.html',
  styleUrls: ['./view-soap-report.component.scss']
})
export class ViewSoapReportComponent {
  mockData = inject(MockDataService);
  pdfExportService = inject(PdfExportService);

  get consultation() {
    return this.mockData.activeConsultation();
  }

  downloadPdf(): void {
    const c = this.consultation;
    if (!c) return;
    this.pdfExportService.exportSoapNotePdf({
      patientName: c.patientName || 'Patient',
      patientId: c.patientId || '#00847261',
      demographics: `${c.age || 42} · ${c.gender || 'M'}`,
      doctorName: c.doctorName || 'Dr. Yuki Tanaka',
      doctorId: c.doctorId || 'DOC-001',
      doctorSpecialty: c.doctorSpecialty || 'Attending Physician',
      encounterId: c.encounterId || 'ENC-001',
      consultationDate: c.date || new Date().toISOString().split('T')[0],
      soap: {
        subjective: c.soapNote?.subjective || '',
        objective: c.soapNote?.objective || '',
        assessment: c.soapNote?.assessment || '',
        plan: c.soapNote?.plan || ''
      }
    });
  }
}
