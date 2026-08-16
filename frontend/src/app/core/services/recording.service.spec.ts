import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RecordingService } from './recording.service';
import { environment } from '../../../environments/environment';

describe('RecordingService', () => {
  let service: RecordingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RecordingService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(RecordingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.resetState();
  });

  it('should be created and start in IDLE state', () => {
    expect(service).toBeTruthy();
    expect(service.state()).toBe('IDLE');
    expect(service.durationSeconds()).toBe(0);
    expect(service.errorMessage()).toBeNull();
    expect(service.recordedBlob()).toBeNull();
    expect(service.recordedFile()).toBeNull();
    expect(service.audioUrl()).toBeNull();
  });

  it('should format duration in seconds into mm:ss format', () => {
    expect(service.formatDuration(0)).toBe('00:00');
    expect(service.formatDuration(5)).toBe('00:05');
    expect(service.formatDuration(65)).toBe('01:05');
    expect(service.formatDuration(3661)).toBe('61:01');
  });

  it('should detect browser supported MIME type correctly', () => {
    const mimeType = service.getSupportedMimeType();
    expect(typeof mimeType).toBe('string');
  });

  it('should resolve correct file extension for MIME types', () => {
    expect(service.getFileExtension('audio/webm;codecs=opus')).toBe('webm');
    expect(service.getFileExtension('audio/mp4')).toBe('mp4');
    expect(service.getFileExtension('audio/ogg;codecs=opus')).toBe('ogg');
    expect(service.getFileExtension('audio/wav')).toBe('wav');
  });

  it('should handle permission denial gracefully during startRecording', async () => {
    spyOn(navigator.mediaDevices, 'getUserMedia').and.rejectWith({
      name: 'NotAllowedError',
      message: 'Permission denied'
    });

    try {
      await service.startRecording();
      fail('Expected startRecording to throw error');
    } catch (err: any) {
      expect(service.state()).toBe('FAILED');
      expect(service.errorMessage()).toContain('Microphone permission denied');
    }
  });

  it('should pause and resume recording when state allows', () => {
    // Manually set state to RECORDING to test state transitions
    (service as any).state.set('RECORDING');
    const mockRecorder = {
      state: 'recording',
      pause: jasmine.createSpy('pause').and.callFake(() => {
        mockRecorder.state = 'paused';
      }),
      resume: jasmine.createSpy('resume').and.callFake(() => {
        mockRecorder.state = 'recording';
      })
    };
    (service as any).mediaRecorder = mockRecorder;

    service.pauseRecording();
    expect(service.state()).toBe('PAUSED');
    expect(mockRecorder.pause).toHaveBeenCalled();

    service.resumeRecording();
    expect(service.state()).toBe('RECORDING');
    expect(mockRecorder.resume).toHaveBeenCalled();
  });


  it('should clean up microphone tracks and stop stream', () => {
    const mockTrack = {
      readyState: 'live',
      stop: jasmine.createSpy('stop')
    };
    (service as any).mediaStream = {
      getTracks: () => [mockTrack]
    };

    service.stopMicrophoneTracks();
    expect(mockTrack.stop).toHaveBeenCalled();
    expect((service as any).mediaStream).toBeNull();
  });

  it('should construct FormData correctly and handle upload in real mode', fakeAsync(() => {
    // Temporarily disable mock upload mode for test
    const originalMockFlag = environment.useMockUpload;
    environment.useMockUpload = false;

    const dummyBlob = new Blob(['test audio content'], { type: 'audio/webm' });
    const dummyFile = new File([dummyBlob], 'rec_CONS-123_1000.webm', { type: 'audio/webm' });

    service.recordedBlob.set(dummyBlob);
    service.recordedFile.set(dummyFile);
    service.sessionMetadata.set({
      encounterId: 'CONS-123',
      doctorId: 'DOC-456',
      patientId: 'P-789',
      recordingStartedAt: '2026-08-16T08:00:00.000Z',
      recordingEndedAt: '2026-08-16T08:15:00.000Z',
      durationSeconds: 900,
      mimeType: 'audio/webm',
      fileName: 'rec_CONS-123_1000.webm',
      fileSize: dummyBlob.size
    });
    service.state.set('READY_TO_UPLOAD');

    let uploadResult: any;
    service.uploadRecording().subscribe((res) => {
      uploadResult = res;
    });

    expect(service.state()).toBe('UPLOADING');

    const req = httpMock.expectOne(`${environment.apiBaseUrl}${environment.recordingEndpoint}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBeNull(); // Ensure NO manual Content-Type header set!

    const body = req.request.body as FormData;
    expect(body.has('file')).toBeTrue();
    expect(body.get('encounter_id')).toBe('CONS-123');
    expect(body.get('doctor_id')).toBe('DOC-456');
    expect(body.get('patient_id')).toBe('P-789');
    expect(body.get('recording_started_at')).toBe('2026-08-16T08:00:00.000Z');
    expect(body.get('recording_ended_at')).toBe('2026-08-16T08:15:00.000Z');
    expect(body.get('duration_seconds')).toBe('900');

    req.flush({
      id: 'REC-999',
      status: 'Uploaded',
      encounterId: 'CONS-123'
    });

    tick();
    expect(service.state()).toBe('UPLOADED');
    expect(uploadResult.id).toBe('REC-999');

    environment.useMockUpload = originalMockFlag;
  }));

  it('should retain local Blob and File when upload fails', fakeAsync(() => {
    const originalMockFlag = environment.useMockUpload;
    environment.useMockUpload = false;

    const dummyBlob = new Blob(['test audio content'], { type: 'audio/webm' });
    const dummyFile = new File([dummyBlob], 'rec_CONS-123_1000.webm', { type: 'audio/webm' });

    service.recordedBlob.set(dummyBlob);
    service.recordedFile.set(dummyFile);
    service.sessionMetadata.set({
      encounterId: 'CONS-123',
      doctorId: 'DOC-456',
      patientId: 'P-789',
      recordingStartedAt: '2026-08-16T08:00:00.000Z',
      recordingEndedAt: '2026-08-16T08:15:00.000Z',
      durationSeconds: 900,
      mimeType: 'audio/webm',
      fileName: 'rec_CONS-123_1000.webm',
      fileSize: dummyBlob.size
    });
    service.state.set('READY_TO_UPLOAD');

    let uploadError: any;
    service.uploadRecording().subscribe({
      error: (err) => {
        uploadError = err;
      }
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}${environment.recordingEndpoint}`);
    req.flush({ detail: 'Backend storage temporarily unavailable' }, { status: 500, statusText: 'Internal Server Error' });

    tick();
    expect(service.state()).toBe('FAILED');
    expect(service.errorMessage()).toContain('Backend storage temporarily unavailable');
    // Ensure local blob and file are retained for retry!
    expect(service.recordedBlob()).toBe(dummyBlob);
    expect(service.recordedFile()).toBe(dummyFile);

    environment.useMockUpload = originalMockFlag;
  }));

  it('should handle mock upload mode successfully', fakeAsync(() => {
    const originalMockFlag = environment.useMockUpload;
    environment.useMockUpload = true;

    const dummyBlob = new Blob(['test audio'], { type: 'audio/webm' });
    const dummyFile = new File([dummyBlob], 'rec_CONS-123_1000.webm', { type: 'audio/webm' });

    service.recordedBlob.set(dummyBlob);
    service.recordedFile.set(dummyFile);
    service.sessionMetadata.set({
      encounterId: 'CONS-123',
      doctorId: 'DOC-456',
      patientId: 'P-789',
      recordingStartedAt: '2026-08-16T08:00:00.000Z',
      recordingEndedAt: '2026-08-16T08:15:00.000Z',
      durationSeconds: 900,
      mimeType: 'audio/webm',
      fileName: 'rec_CONS-123_1000.webm',
      fileSize: dummyBlob.size
    });

    let mockRes: any;
    service.uploadRecording().subscribe((res) => {
      mockRes = res;
    });

    tick(1500);
    expect(service.state()).toBe('UPLOADED');
    expect(mockRes.status).toBe('Uploaded');

    environment.useMockUpload = originalMockFlag;
  }));
});
