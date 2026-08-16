import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DoctorDashboardComponent } from './doctor-dashboard.component';
import { RecordingService } from '../../../core/services/recording.service';
import { of } from 'rxjs';

describe('DoctorDashboardComponent', () => {
  let component: DoctorDashboardComponent;
  let fixture: ComponentFixture<DoctorDashboardComponent>;
  let recordingService: RecordingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorDashboardComponent],
      providers: [
        RecordingService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorDashboardComponent);
    component = fixture.componentInstance;
    recordingService = TestBed.inject(RecordingService);
    fixture.detectChanges();
  });

  it('should create doctor dashboard component', () => {
    expect(component).toBeTruthy();
    expect(component.visitDetails.patientName).toBe('Marcus Delgado');
  });

  it('should delegate startRecording to RecordingService with context', async () => {
    spyOn(recordingService, 'startRecording').and.returnValue(Promise.resolve());
    await component.startRecording();
    expect(recordingService.startRecording).toHaveBeenCalledWith({
      encounterId: 'CONS-41233',
      doctorId: 'DOC-001',
      patientId: 'P1245'
    });
  });

  it('should delegate pause and resume recording controls', () => {
    spyOn(recordingService, 'pauseRecording');
    spyOn(recordingService, 'resumeRecording');

    component.pauseRecording();
    expect(recordingService.pauseRecording).toHaveBeenCalled();

    component.resumeRecording();
    expect(recordingService.resumeRecording).toHaveBeenCalled();
  });

  it('should delegate stop recording to RecordingService', async () => {
    const dummyBlob = new Blob(['audio data'], { type: 'audio/webm' });
    spyOn(recordingService, 'stopRecording').and.returnValue(Promise.resolve(dummyBlob));
    await component.stopRecording();
    expect(recordingService.stopRecording).toHaveBeenCalled();
  });

  it('should trigger uploadRecording on RecordingService', () => {
    spyOn(recordingService, 'uploadRecording').and.returnValue(of({
      id: 'REC-123',
      status: 'Uploaded',
      encounterId: 'CONS-41233'
    }));

    component.uploadRecording();
    expect(recordingService.uploadRecording).toHaveBeenCalled();
  });

  it('should clean up microphone tracks when component is destroyed', () => {
    spyOn(recordingService, 'stopMicrophoneTracks');
    component.ngOnDestroy();
    expect(recordingService.stopMicrophoneTracks).toHaveBeenCalled();
  });
});
