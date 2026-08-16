import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SoapPrescriptionComponent } from './soap-prescription.component';

describe('SoapPrescriptionComponent', () => {
  let component: SoapPrescriptionComponent;
  let fixture: ComponentFixture<SoapPrescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoapPrescriptionComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SoapPrescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create soap prescription component', () => {
    expect(component).toBeTruthy();
  });
});
