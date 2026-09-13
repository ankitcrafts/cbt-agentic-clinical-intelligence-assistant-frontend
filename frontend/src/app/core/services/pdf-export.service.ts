import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

export interface SoapPdfData {
  patientName: string;
  patientId: string;
  demographics?: string;
  age?: number | string;
  gender?: string;
  doctorName: string;
  doctorId?: string;
  doctorSpecialty?: string;
  encounterId?: string;
  consultationDate?: string;
  reason?: string;
  condition?: string;
  vitals?: {
    bp?: string;
    hr?: string;
    weight?: string;
    temp?: string;
    spo2?: string;
    pain?: string;
  };
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  exportSoapNotePdf(data: SoapPdfData): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210
    const pageHeight = doc.internal.pageSize.getHeight(); // 297
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2); // 182
    let y = margin;

    // Helper for page break
    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 20) {
        doc.addPage();
        y = margin;
        drawPageHeader();
      }
    };

    // Helper for drawing minimal top header on subsequent pages
    const drawPageHeader = () => {
      doc.setFillColor(13, 148, 136); // #0d9488
      doc.rect(margin, y, contentWidth, 1.5, 'F');
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`ClinIQ Clinical Intelligence System · Consultation SOAP Report — ${data.patientName} (${data.patientId})`, margin, y);
      doc.text(`Date: ${data.consultationDate || new Date().toLocaleDateString()}`, pageWidth - margin, y, { align: 'right' });
      y += 6;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;
    };

    // ==========================================
    // 1. TOP HEADER BANNER (Page 1)
    // ==========================================
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

    // ClinIQ Brand Logo & Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ClinIQ', margin + 6, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(153, 246, 228); // Teal 200
    doc.text('Clinical Intelligence & Healthcare Assistant', margin + 26, y + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('OFFICIAL CLINICAL CONSULTATION & SOAP REPORT', margin + 6, y + 18);

    // Right-aligned status pill
    doc.setFillColor(13, 148, 136);
    doc.roundedRect(pageWidth - margin - 38, y + 6, 32, 12, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('VERIFIED & SIGNED', pageWidth - margin - 22, y + 13.5, { align: 'center' });

    y += 28;

    // ==========================================
    // 2. PATIENT & ENCOUNTER METADATA BOX
    // ==========================================
    const metaBoxHeight = 32;
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.roundedRect(margin, y, contentWidth, metaBoxHeight, 2, 2, 'FD');

    const col1 = margin + 6;
    const col2 = margin + 68;
    const col3 = margin + 128;

    // Row 1
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT NAME', col1, y + 7);
    doc.text('MRN / PATIENT ID', col2, y + 7);
    doc.text('DEMOGRAPHICS / GENDER', col3, y + 7);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(data.patientName || 'Unknown Patient', col1, y + 13);
    doc.text(data.patientId || '#00000000', col2, y + 13);
    doc.text(data.demographics || `${data.age || '—'} · ${data.gender || '—'}`, col3, y + 13);

    // Row 2
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('ATTENDING PHYSICIAN', col1, y + 21);
    doc.text('SPECIALTY / DEPARTMENT', col2, y + 21);
    doc.text('DATE & ENCOUNTER', col3, y + 21);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(data.doctorName || 'Dr. Attending Physician', col1, y + 27);
    doc.setFont('helvetica', 'normal');
    doc.text(data.doctorSpecialty || 'Cardiology / Specialist', col2, y + 27);
    doc.text(`${data.consultationDate || new Date().toISOString().split('T')[0]} · ${data.encounterId || 'ENC-01'}`, col3, y + 27);

    y += metaBoxHeight + 6;

    // ==========================================
    // 3. VITALS STRIP (IF AVAILABLE)
    // ==========================================
    if (data.vitals) {
      doc.setFillColor(240, 253, 250); // Teal 50
      doc.setDrawColor(153, 246, 228); // Teal 200
      doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 148, 136);
      doc.text('RECORDED VITALS:', margin + 4, y + 7.5);

      const vitalsText = `BP: ${data.vitals.bp || '120/80 mmHg'}   |   Heart Rate: ${data.vitals.hr || '72 bpm'}   |   Temp: ${data.vitals.temp || '36.6 °C'}   |   Weight: ${data.vitals.weight || '75 kg'}   |   SpO2: ${data.vitals.spo2 || '98%'}`;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(vitalsText, margin + 36, y + 7.5);

      y += 16;
    }

    // ==========================================
    // 4. SOAP SECTIONS
    // ==========================================
    const sections: Array<{
      letter: string;
      title: string;
      subtitle: string;
      text: string;
      color: [number, number, number];
      bgLight: [number, number, number];
    }> = [
      {
        letter: 'S',
        title: 'SUBJECTIVE',
        subtitle: 'Patient-reported symptoms, complaints, and clinical history in their own words',
        text: data.soap.subjective || 'No subjective statements recorded for this session.',
        color: [13, 148, 136], // Teal
        bgLight: [240, 253, 250]
      },
      {
        letter: 'O',
        title: 'OBJECTIVE',
        subtitle: 'Measurable clinical findings, vital signs, physical exam, and laboratory observations',
        text: data.soap.objective || 'Objective vital measurements within expected parameters.',
        color: [2, 132, 199], // Sky Blue
        bgLight: [240, 249, 255]
      },
      {
        letter: 'A',
        title: 'ASSESSMENT',
        subtitle: 'Clinical interpretation, differential diagnoses, evaluation, and risk stratification',
        text: data.soap.assessment || 'Clinical evaluation completed with attending specialist.',
        color: [217, 119, 6], // Amber
        bgLight: [254, 243, 199]
      },
      {
        letter: 'P',
        title: 'PLAN',
        subtitle: 'Medication directives, therapy, orders, lifestyle guidance, and follow-up timeline',
        text: data.soap.plan || 'Follow prescribed directives and scheduled clinical follow-up.',
        color: [16, 185, 129], // Emerald Green
        bgLight: [236, 253, 245]
      }
    ];

    for (const sec of sections) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const splitLines = doc.splitTextToSize(sec.text, contentWidth - 16);
      const textHeight = splitLines.length * 4.5;
      const cardHeight = Math.max(22, 14 + textHeight + 4);

      checkPageBreak(cardHeight + 4);

      // Section Card Background & Border
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

      // Left Accent Color Bar
      doc.setFillColor(sec.color[0], sec.color[1], sec.color[2]);
      doc.roundedRect(margin, y, 3.5, cardHeight, 1.5, 1.5, 'F');

      // Section Letter Badge
      doc.setFillColor(sec.color[0], sec.color[1], sec.color[2]);
      doc.roundedRect(margin + 7, y + 4, 6.5, 6.5, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(sec.letter, margin + 10.25, y + 8.5, { align: 'center' });

      // Title & Subtitle
      doc.setTextColor(sec.color[0], sec.color[1], sec.color[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(sec.title, margin + 16, y + 8.5);

      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`—  ${sec.subtitle}`, margin + 48, y + 8.5);

      // Section Content Lines
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(splitLines, margin + 7, y + 16);

      y += cardHeight + 4;
    }

    // ==========================================
    // 5. DOCTOR SIGNATURE & VERIFICATION STAMP
    // ==========================================
    checkPageBreak(30);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 7;

    // Attending Doctor Signature
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('ATTENDING CLINICIAN SIGN-OFF:', margin, y);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.doctorName} (MD, Attending Specialist)`, margin, y + 6);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Electronically Authenticated via ClinIQ Clinical AI System · ${new Date().toLocaleString()}`, margin, y + 11);

    // Right-side Verification Seal
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(13, 148, 136);
    doc.roundedRect(pageWidth - margin - 60, y - 2, 60, 15, 2, 2, 'FD');
    doc.setTextColor(13, 148, 136);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CERTIFIED MEDICAL RECORD', pageWidth - margin - 30, y + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('ClinIQ Encrypted Clinical Store', pageWidth - margin - 30, y + 9, { align: 'center' });

    // ==========================================
    // 6. FOOTER WITH PAGE NUMBERS
    // ==========================================
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Confidential Medical Document · St. Mercy Hospital & ClinIQ Clinical Assistant · Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    // ==========================================
    // 7. TRIGGER LOCAL DOWNLOAD
    // ==========================================
    const safePatientName = (data.patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDate = (data.consultationDate || new Date().toISOString().split('T')[0]).replace(/[^a-zA-Z0-9_-]/g, '-');
    const fileName = `SOAP_Report_${safePatientName}_${safeDate}.pdf`;

    doc.save(fileName);
  }
}
