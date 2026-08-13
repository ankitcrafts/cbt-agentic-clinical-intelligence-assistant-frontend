import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KeyFeaturesBarComponent } from './key-features-bar.component';

describe('KeyFeaturesBarComponent', () => {
  let component: KeyFeaturesBarComponent;
  let fixture: ComponentFixture<KeyFeaturesBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyFeaturesBarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KeyFeaturesBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create key features bar component', () => {
    expect(component).toBeTruthy();
  });
});
