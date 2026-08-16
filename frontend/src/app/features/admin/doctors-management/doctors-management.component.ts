import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../../core/services/mock-data.service';

@Component({
  selector: 'app-doctors-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctors-management.component.html',
  styleUrls: ['./doctors-management.component.scss']
})
export class DoctorsManagementComponent {
  mockData = inject(MockDataService);
  searchTerm = '';

  showAddModal = false;
  newDoctor = { name: '', specialization: '', email: '' };

  get filteredDoctors() {
    return this.mockData.doctors().filter(doc => 
      doc.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      doc.email.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  toggleAddModal() {
    this.showAddModal = !this.showAddModal;
  }

  addDoctor() {
    if (this.newDoctor.name && this.newDoctor.specialization && this.newDoctor.email) {
      const doc = {
        id: (this.mockData.doctors().length + 1).toString(),
        name: this.newDoctor.name,
        specialization: this.newDoctor.specialization,
        email: this.newDoctor.email,
        status: 'Active' as const
      };
      this.mockData.doctors.update(docs => [...docs, doc]);
      this.newDoctor = { name: '', specialization: '', email: '' };
      this.showAddModal = false;
    }
  }
}
