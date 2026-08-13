import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-key-features-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './key-features-bar.component.html',
  styleUrls: ['./key-features-bar.component.scss']
})
export class KeyFeaturesBarComponent {
  features = [
    { icon: 'fa-shield-halved', title: 'Secure Authentication', subtitle: 'Role-based access control' },
    { icon: 'fa-microphone-lines', title: 'Audio Recording', subtitle: 'High quality recording' },
    { icon: 'fa-robot', title: 'ASR Technology', subtitle: 'Accurate speech to text' },
    { icon: 'fa-bolt', title: 'Quick Processing', subtitle: 'Transcript within 1 minute' },
    { icon: 'fa-file-lines', title: 'SOAP Generation', subtitle: 'AI-powered clinical notes' },
    { icon: 'fa-file-arrow-down', title: 'Reports & Prescriptions', subtitle: 'Download & share' },
    { icon: 'fa-network-wired', title: 'EMR Integration', subtitle: 'Seamless data flow' },
    { icon: 'fa-lock', title: 'HIPAA Compliant', subtitle: 'Secure & private' }
  ];
}
