import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-key-features-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './key-features-bar.component.html',
  styleUrls: ['./key-features-bar.component.scss']
})
export class KeyFeaturesBarComponent implements OnInit {
  isVisible = true;
  showSettingsModal = false;
  cookieChoice: 'all' | 'essential' | 'none' | null = null;

  ngOnInit() {
    const savedChoice = localStorage.getItem('cliniq_cookie_consent');
    if (savedChoice) {
      this.cookieChoice = savedChoice as any;
    }
  }

  allowAll() {
    this.cookieChoice = 'all';
    localStorage.setItem('cliniq_cookie_consent', 'all');
    this.isVisible = false;
  }

  declineCookies() {
    this.cookieChoice = 'none';
    localStorage.setItem('cliniq_cookie_consent', 'none');
    this.isVisible = false;
  }

  dismissBanner() {
    this.isVisible = false;
  }

  openSettings() {
    this.showSettingsModal = !this.showSettingsModal;
  }

  saveSettings(onlyEssential: boolean) {
    this.cookieChoice = onlyEssential ? 'essential' : 'all';
    localStorage.setItem('cliniq_cookie_consent', this.cookieChoice);
    this.showSettingsModal = false;
    this.isVisible = false;
  }
}
