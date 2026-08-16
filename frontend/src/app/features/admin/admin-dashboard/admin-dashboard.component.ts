import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from '../../../core/services/mock-data.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent {
  mockData = inject(MockDataService);

  todayDate = 'August 13, 2026';

  clinicians = [
    { initials: 'AO', name: 'Dr. Amara Osei', specialty: 'Cardiology', available: true, status: 'On duty', patients: 18, loadPct: 51, loadColor: '#0d9488' },
    { initials: 'LF', name: 'Dr. Lena Fischer', specialty: 'Neurology', available: false, status: 'Off duty', patients: 12, loadPct: 34, loadColor: '#0d9488' },
    { initials: 'RM', name: 'Dr. Ravi Menon', specialty: 'Internal Medicine', available: true, status: 'On duty', patients: 24, loadPct: 69, loadColor: '#0d9488' },
    { initials: 'SR', name: 'Dr. Sofia Reyes', specialty: 'Oncology', available: true, status: 'On duty', patients: 9, loadPct: 26, loadColor: '#0d9488' },
    { initials: 'JW', name: 'Dr. James Whitfield', specialty: 'Orthopedics', available: false, status: 'Off duty', patients: 15, loadPct: 43, loadColor: '#0d9488' },
    { initials: 'YT', name: 'Dr. Yuki Tanaka', specialty: 'Pediatrics', available: true, status: 'On duty', patients: 31, loadPct: 89, loadColor: '#d97706' }
  ];

  recentActivities = [
    { title: 'New doctor registered', desc: 'Dr. Rahul Sharma', time: '2 min ago', icon: 'fa-user-plus', color: '#10b981' },
    { title: 'New patient registered', desc: 'Priya Verma', time: '15 min ago', icon: 'fa-hospital-user', color: '#0284c7' },
    { title: 'Recording processed', desc: 'Consultation ID: 41234', time: '24 min ago', icon: 'fa-file-audio', color: '#8b5cf6' },
    { title: 'Report generated', desc: 'Consultation ID: 41233', time: '35 min ago', icon: 'fa-file-lines', color: '#f59e0b' }
  ];
}
