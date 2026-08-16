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
    if (role === 'ADMIN') return 'Administrator Portal';
    if (role === 'DOCTOR') return 'Clinical Care Portal';
    return 'Patient Health Portal';
  }
}
