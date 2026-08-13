import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../../core/services/mock-data.service';

@Component({
  selector: 'app-patients-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients-management.component.html',
  styleUrls: ['./patients-management.component.scss']
})
export class PatientsManagementComponent {
  mockData = inject(MockDataService);
  searchTerm = '';

  get filteredPatients() {
    return this.mockData.patients().filter(pat => 
      pat.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      pat.phone.includes(this.searchTerm) ||
      pat.pid.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
