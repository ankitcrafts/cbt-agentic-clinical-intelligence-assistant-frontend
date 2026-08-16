import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConsultationRecordingComponent } from './consultation-recording.component';
import { RecordingService } from '../../../core/services/recording.service';

describe('ConsultationRecordingComponent', () => {
  let component: ConsultationRecordingComponent;
  let fixture: ComponentFixture<ConsultationRecordingComponent>;
  let recordingService: RecordingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultationRecordingComponent],
      providers: [
        RecordingService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultationRecordingComponent);
    component = fixture.componentInstance;
    recordingService = TestBed.inject(RecordingService);
    fixture.detectChanges();
  });

  it('should create consultation recording component', () => {
    expect(component).toBeTruthy();
  });

  it('should call startRecording on RecordingService', async () => {
    spyOn(recordingService, 'startRecording').and.returnValue(Promise.resolve());
    await component.startRecording();
    expect(recordingService.startRecording).toHaveBeenCalled();
  });

  it('should toggle pause and resume based on recording state', () => {
    (recordingService as any).state.set('RECORDING');
    spyOn(recordingService, 'pauseRecording');
    component.togglePause();
    expect(recordingService.pauseRecording).toHaveBeenCalled();

    (recordingService as any).state.set('PAUSED');
    spyOn(recordingService, 'resumeRecording');
    component.togglePause();
    expect(recordingService.resumeRecording).toHaveBeenCalled();
  });

  it('should stop recording and release microphone tracks on destroy', () => {
    spyOn(recordingService, 'stopMicrophoneTracks');
    component.ngOnDestroy();
    expect(recordingService.stopMicrophoneTracks).toHaveBeenCalled();
  });
});
