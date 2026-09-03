import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  authService = inject(AuthService);

  get roleBadgeText(): string {
    const role = this.authService.currentRole();
    const user = this.authService.currentUser();
    if (role === 'ADMIN') return `${user?.name || 'Administrator'} (Hospital Operations)`;
    if (role === 'DOCTOR') return user?.name || 'Dr. Yuki Tanaka';
    return `${user?.name || 'Patient Portal'}`;
  }
}
