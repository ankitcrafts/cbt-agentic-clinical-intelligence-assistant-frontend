import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsultationRecordingComponent } from './consultation-recording.component';

describe('ConsultationRecordingComponent', () => {
  let component: ConsultationRecordingComponent;
  let fixture: ComponentFixture<ConsultationRecordingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultationRecordingComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultationRecordingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create consultation recording component', () => {
    expect(component).toBeTruthy();
  });
});
