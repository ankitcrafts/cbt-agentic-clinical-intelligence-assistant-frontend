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

  recentActivities = [
    { title: 'New doctor registered', desc: 'Dr. Rahul Sharma', time: '2 min ago', icon: 'fa-user-plus', color: '#10b981' },
    { title: 'New patient registered', desc: 'Priya Verma', time: '15 min ago', icon: 'fa-hospital-user', color: '#0284c7' },
    { title: 'Recording processed', desc: 'Consultation ID: 41234', time: '24 min ago', icon: 'fa-file-audio', color: '#8b5cf6' },
    { title: 'Report generated', desc: 'Consultation ID: 41233', time: '35 min ago', icon: 'fa-file-lines', color: '#f59e0b' }
  ];
}
