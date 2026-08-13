import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DoctorFlowComponent } from './doctor-flow.component';

describe('DoctorFlowComponent', () => {
  let component: DoctorFlowComponent;
  let fixture: ComponentFixture<DoctorFlowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorFlowComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create doctor flow component', () => {
    expect(component).toBeTruthy();
  });
});
