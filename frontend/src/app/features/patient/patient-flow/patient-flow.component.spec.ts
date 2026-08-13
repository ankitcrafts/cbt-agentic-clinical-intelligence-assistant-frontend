import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientFlowComponent } from './patient-flow.component';

describe('PatientFlowComponent', () => {
  let component: PatientFlowComponent;
  let fixture: ComponentFixture<PatientFlowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientFlowComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create patient flow component', () => {
    expect(component).toBeTruthy();
  });
});
