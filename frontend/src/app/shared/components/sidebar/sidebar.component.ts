import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  authService = inject(AuthService);

  get currentRole() {
    return this.authService.currentRole();
  }

  get currentStep() {
    return this.authService.currentStep();
  }

  navigateToStep(step: number) {
    this.authService.setStep(step);
  }
}
