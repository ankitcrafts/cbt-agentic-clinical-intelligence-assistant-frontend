import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { MockDataService } from './mock-data.service';
import {
  RecordingState,
  RecordingSessionMetadata,
  RecordingUploadResponse,
  RecordedSessionItem,
  TranscriptExchange,
  AISuggestion,
  ClinicalAnalysisData
} from '../models/recording.model';

@Injectable({
  providedIn: 'root'
})
export class RecordingService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private mockData = inject(MockDataService);

  // Maximum consultation recording time (20 minutes)
  readonly MAX_DURATION_SECONDS = 1200;

  // Reactive State Signals
  readonly state = signal<RecordingState>('IDLE');
  readonly durationSeconds = signal<number>(0);
  readonly errorMessage = signal<string | null>(null);
  readonly recordedBlob = signal<Blob | null>(null);
  readonly recordedFile = signal<File | null>(null);
  readonly audioUrl = signal<string | null>(null);
  readonly sessionMetadata = signal<RecordingSessionMetadata | null>(null);
  readonly mimeType = signal<string>('audio/wav');
  readonly selectedFormat = signal<'wav' | 'mp3' | 'webm'>('wav');

  // Real-Time Google Drive & Deepgram Transcription Results
  readonly isTranscribing = signal<boolean>(false);
  readonly latestTranscript = signal<string>('');
  readonly latestExchanges = signal<TranscriptExchange[]>([]);
  readonly latestSuggestions = signal<AISuggestion[]>([]);
  readonly latestClinicalAnalysis = signal<ClinicalAnalysisData | null>(null);
  readonly gdriveWebViewLink = signal<string | null>(null);
  readonly gdriveFileId = signal<string | null>(null);

  // Recorded Sessions History List
  readonly recordedSessions = signal<RecordedSessionItem[]>([]);

  // Patient-Isolated Session Storage Map (keyed by patient ID)
  private patientSessionsMap = new Map<string, any>();
  currentPatientId: string | null = null;

  // Internal Web API References
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private timerInterval: any = null;
  private startTimeIso: string | null = null;
  private endTimeIso: string | null = null;

  constructor() {}

  ngOnDestroy(): void {
    this.cleanupRecording();
  }

  /**
   * Sets user preferred target audio format (wav, mp3, webm).
   */
  setTargetFormat(format: 'wav' | 'mp3' | 'webm'): void {
    this.selectedFormat.set(format);
  }

  /**
   * Detects browser-supported MIME type dynamically.
   * Preserves actual supported format instead of falsely labeling WebM as WAV/MP3.
   */
  getSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined') {
      return '';
    }
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];

    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // Browser default
  }

  /**
   * Returns proper file extension based on MIME type.
   */
  getFileExtension(mimeType: string): string {
    const lower = mimeType.toLowerCase();
    if (lower.includes('wav')) {
      return 'wav';
    }
    if (lower.includes('mp3') || lower.includes('mpeg')) {
      return 'mp3';
    }
    if (lower.includes('mp4') || lower.includes('m4a')) {
      return 'mp4';
    }
    if (lower.includes('ogg')) {
      return 'ogg';
    }
    return 'webm';
  }

  /**
   * Formats duration in seconds to mm:ss format.
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Starts microphone recording.
   */
  async startRecording(context?: { encounterId?: string; doctorId?: string; patientId?: string }): Promise<void> {
    this.errorMessage.set(null);
    this.state.set('REQUESTING_PERMISSION');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const err = 'Microphone access is not supported by your browser environment.';
      this.errorMessage.set(err);
      this.state.set('FAILED');
      throw new Error(err);
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        ? 'Microphone permission denied. Please allow microphone access to record.'
        : `Microphone access error: ${err.message || 'Unable to access microphone.'}`;
      this.errorMessage.set(msg);
      this.state.set('FAILED');
      this.stopMicrophoneTracks();
      throw err;
    }

    const detectedMimeType = this.getSupportedMimeType();
    this.mimeType.set(detectedMimeType || /* 'audio/webm' || */ 'audio/wav');

    try {
      const options = detectedMimeType ? { mimeType: detectedMimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
    } catch (err: any) {
      const msg = `MediaRecorder initialization failed: ${err.message || 'Unsupported MIME type.'}`;
      this.errorMessage.set(msg);
      this.state.set('FAILED');
      this.stopMicrophoneTracks();
      throw err;
    }

    this.audioChunks = [];
    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onerror = (event: any) => {
      this.errorMessage.set(`Recording error occurred: ${event.error?.message || 'Unknown error'}`);
      this.state.set('FAILED');
      this.stopMicrophoneTracks();
    };

    this.startTimeIso = new Date().toISOString();
    this.durationSeconds.set(0);
    this.audioUrl.set(null);
    this.recordedBlob.set(null);
    this.recordedFile.set(null);
    this.sessionMetadata.set(null);

    this.mediaRecorder.start(1000);
    this.state.set('RECORDING');
    this.startTimer();
  }

  /**
   * Pauses an active recording session.
   */
  pauseRecording(): void {
    if (this.state() === 'RECORDING' && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.state.set('PAUSED');
    }
  }

  /**
   * Resumes a paused recording session.
   */
  resumeRecording(): void {
    if (this.state() === 'PAUSED' && this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.state.set('RECORDING');
    }
  }

  /**
   * Stops recording, collects audio chunks, constructs Blob, File, and playback URL,
   * and releases microphone hardware tracks.
   */
  stopRecording(context?: { encounterId?: string; doctorId?: string; patientId?: string }): Promise<Blob | null> {
    return new Promise((resolve) => {
      this.stopTimer();

      if (!this.mediaRecorder || (this.mediaRecorder.state !== 'recording' && this.mediaRecorder.state !== 'paused')) {
        this.stopMicrophoneTracks();
        resolve(this.recordedBlob());
        return;
      }

      this.endTimeIso = new Date().toISOString();

      this.mediaRecorder.onstop = async () => {
        this.stopMicrophoneTracks();

        if (this.audioChunks.length === 0) {
          this.errorMessage.set('Empty recording captured. Please try recording again.');
          this.state.set('FAILED');
          resolve(null);
          return;
        }

        const rawMimeType = this.mimeType() || 'audio/webm';
        let finalBlob = new Blob(this.audioChunks, { type: rawMimeType });

        if (finalBlob.size === 0) {
          this.errorMessage.set('Empty recording file created. Please try recording again.');
          this.state.set('FAILED');
          resolve(null);
          return;
        }

        const fmt = this.selectedFormat();
        let targetMime = rawMimeType;
        let ext = 'webm';

        if (fmt === 'wav' || fmt === 'mp3') {
          try {
            const wavBlob = await this.convertToWav(finalBlob);
            if (fmt === 'wav') {
              finalBlob = wavBlob;
              targetMime = 'audio/wav';
              ext = 'wav';
            } else {
              finalBlob = new Blob([wavBlob], { type: 'audio/mpeg' });
              targetMime = 'audio/mpeg';
              ext = 'mp3';
            }
          } catch (err) {
            ext = this.getFileExtension(rawMimeType);
          }
        } else {
          ext = this.getFileExtension(rawMimeType);
        }

        this.mimeType.set(targetMime);

        const encounterId = context?.encounterId || this.mockData.activeConsultation().id || 'CONS-41233';
        const doctorId = context?.doctorId || 'DOC-001';
        const patientId = context?.patientId || this.mockData.activeConsultation().patientPid || 'P1245';
        const fileName = `rec_${encounterId}_${Date.now()}.${ext}`;

        const file = new File([finalBlob], fileName, { type: targetMime });
        const previewUrl = URL.createObjectURL(finalBlob);

        const metadata: RecordingSessionMetadata = {
          encounterId,
          doctorId,
          patientId,
          recordingStartedAt: this.startTimeIso || new Date().toISOString(),
          recordingEndedAt: this.endTimeIso || new Date().toISOString(),
          durationSeconds: this.durationSeconds(),
          mimeType: targetMime,
          fileName,
          fileSize: finalBlob.size
        };

        const sessionItem: RecordedSessionItem = {
          id: `session_${Date.now()}_${this.sessionNumber()}`,
          sessionNumber: this.sessionNumber(),
          sessionTitle: this.sessionTitle(),
          durationSeconds: metadata.durationSeconds,
          formattedDuration: this.formatDuration(metadata.durationSeconds),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recordedBlob: finalBlob,
          recordedFile: file,
          audioUrl: previewUrl,
          metadata,
          status: 'READY'
        };

        this.recordedBlob.set(finalBlob);
        this.recordedFile.set(file);
        this.audioUrl.set(previewUrl);
        this.sessionMetadata.set(metadata);
        this.recordedSessions.update(list => [...list, sessionItem]);
        this.state.set('READY_TO_UPLOAD');

        resolve(finalBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Converts recorded audio blob to standard WAV audio using Web Audio API AudioContext.
   */
  async convertToWav(rawBlob: Blob): Promise<Blob> {
    try {
      const arrayBuffer = await rawBlob.arrayBuffer();
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        return rawBlob;
      }
      const audioCtx = new AudioCtx();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const wavBlob = this.encodeWav(audioBuffer);
      await audioCtx.close();
      return wavBlob;
    } catch (err) {
      console.warn('WAV conversion warning, preserving raw audio blob format:', err);
      return rawBlob;
    }
  }

  /**
   * Encodes decoded PCM AudioBuffer into standard 16-bit PCM WAV Blob.
   */
  private encodeWav(audioBuffer: AudioBuffer): Blob {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // 16-bit PCM
    const bitDepth = 16;

    let interleaved: Float32Array;
    if (numChannels === 2) {
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      interleaved = new Float32Array(left.length + right.length);
      let index = 0;
      let inputIndex = 0;
      while (index < interleaved.length) {
        interleaved[index++] = left[inputIndex];
        interleaved[index++] = right[inputIndex];
        inputIndex++;
      }
    } else {
      interleaved = audioBuffer.getChannelData(0);
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = interleaved.length * bytesPerSample;
    const headerLength = 44;
    const buffer = new ArrayBuffer(headerLength + dataSize);
    const view = new DataView(buffer);

    /* RIFF identifier */
    this.writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + dataSize, true);
    /* RIFF type */
    this.writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    this.writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (PCM) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate */
    view.setUint32(28, sampleRate * blockAlign, true);
    /* block align */
    view.setUint16(32, blockAlign, true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    this.writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, dataSize, true);

    /* Write 16-bit PCM samples */
    let offset = 44;
    for (let i = 0; i < interleaved.length; i++, offset += 2) {
      const sample = Math.max(-1, Math.min(1, interleaved[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /**
   * Prepares multipart/form-data payload and uploads recording to backend.
   * Uploads to Google Drive, triggers real-time Deepgram transcription & AI analysis.
   */
  uploadRecording(overrideContext?: {
    encounterId?: string;
    doctorId?: string;
    patientId?: string;
    doctorName?: string;
    patientName?: string;
    doctorInitials?: string;
    patientInitials?: string;
  }): Observable<RecordingUploadResponse> {
    if (this.state() === 'UPLOADING' || this.state() === 'TRANSCRIBING') {
      return throwError(() => new Error('Upload is already in progress.'));
    }

    const file = this.recordedFile();
    const metadata = this.sessionMetadata();

    if (!file || !metadata) {
      const err = 'No recorded audio file available to upload.';
      this.errorMessage.set(err);
      this.state.set('FAILED');
      return throwError(() => new Error(err));
    }

    this.state.set('UPLOADING');
    this.isTranscribing.set(true);
    this.errorMessage.set(null);

    const activeCons = this.mockData.activeConsultation();
    const encounterId = overrideContext?.encounterId || metadata.encounterId || activeCons.id || 'CONS-41233';
    const doctorId = overrideContext?.doctorId || metadata.doctorId || 'DOC-001';
    const patientId = overrideContext?.patientId || metadata.patientId || activeCons.patientPid || 'P1245';
    const doctorName = overrideContext?.doctorName || 'Dr. Yuki Tanaka';
    const patientName = overrideContext?.patientName || activeCons.patientName || 'Marcus Delgado';
    const doctorInitials = overrideContext?.doctorInitials || 'YT';
    const patientInitials = overrideContext?.patientInitials || 'MD';

    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('encounter_id', encounterId);
    formData.append('doctor_id', doctorId);
    formData.append('patient_id', patientId);
    formData.append('doctor_name', doctorName);
    formData.append('patient_name', patientName);
    formData.append('doctor_initials', doctorInitials);
    formData.append('patient_initials', patientInitials);
    formData.append('recording_started_at', metadata.recordingStartedAt);
    formData.append('recording_ended_at', metadata.recordingEndedAt);
    formData.append('duration_seconds', metadata.durationSeconds.toString());
    formData.append('auto_transcribe', 'true');

    // Real API POST call to configured FastAPI backend endpoint
    const url = `${environment.apiBaseUrl}${environment.recordingEndpoint}`;

    return this.http.post<RecordingUploadResponse>(url, formData).pipe(
      tap((res) => {
        this.state.set('UPLOADED');
        this.isTranscribing.set(false);

        // Store Google Drive & Transcription results in reactive signals
        if (res.gdriveWebViewLink) {
          this.gdriveWebViewLink.set(res.gdriveWebViewLink);
        }
        if (res.gdriveFileId) {
          this.gdriveFileId.set(res.gdriveFileId);
        }
        if (res.transcript) {
          this.latestTranscript.set(res.transcript);
        }
        if (res.exchanges && res.exchanges.length > 0) {
          this.latestExchanges.set(res.exchanges);
        }
        const suggestions = res.ai_suggestions || res.aiSuggestions;
        if (suggestions && suggestions.length > 0) {
          this.latestSuggestions.set(suggestions);
        }
        const analysis = res.clinical_analysis || res.clinicalAnalysis;
        if (analysis) {
          this.latestClinicalAnalysis.set(analysis);
        }

        // Sync with active consultation details
        if (res.exchanges && res.exchanges.length > 0) {
          this.mockData.activeConsultation.update(prev => ({
            ...prev,
            transcript: res.exchanges!.map(e => ({
              speaker: e.isDoctor ? 'Doctor' : 'Patient',
              text: e.text,
              timestamp: e.timestamp || '00:00'
            })),
            soapNote: res.soap_report ? {
              subjective: res.soap_report.subjective || prev.soapNote.subjective,
              objective: res.soap_report.objective || prev.soapNote.objective,
              assessment: res.soap_report.assessment || prev.soapNote.assessment,
              plan: res.soap_report.plan || prev.soapNote.plan,
            } : prev.soapNote
          }));
        }

        // Save session data to patient-specific cache
        const normPid = patientId ? (patientId.startsWith('#') ? patientId : '#' + patientId) : (this.currentPatientId || 'P1245');
        this.saveCurrentPatientSession(normPid);
        if (this.currentPatientId) {
          this.saveCurrentPatientSession(this.currentPatientId);
        }
      }),
      catchError((error) => {
        this.isTranscribing.set(false);
        const errorMsg = error.error?.detail || error.message || 'Upload failed due to network error. Local recording retained.';
        this.errorMessage.set(errorMsg);
        this.state.set('FAILED');
        return throwError(() => error);
      })
    );
  }

  /**
   * Triggers browser download of the recorded audio file locally.
   */
  downloadRecording(): void {
    const url = this.audioUrl();
    const metadata = this.sessionMetadata();

    if (!url || typeof document === 'undefined') {
      return;
    }

    const fileName = metadata?.fileName || `recording_${Date.now()}.${this.getFileExtension(this.mimeType())}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Retries uploading retained local recording.
   */
  retryUpload(overrideContext?: { encounterId?: string; doctorId?: string; patientId?: string }): Observable<RecordingUploadResponse> {
    return this.uploadRecording(overrideContext);
  }

  /**
   * Stops all active microphone tracks to release hardware indicator.
   */
  stopMicrophoneTracks(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      this.mediaStream = null;
    }
  }

  /**
   * Uploads an individual recorded session item.
   */
  uploadSessionItem(session: RecordedSessionItem): Observable<RecordingUploadResponse> {
    this.updateSessionStatus(session.id, 'UPLOADING');

    const activeCons = this.mockData.activeConsultation();
    const rawPid = session.metadata.patientId || this.currentPatientId || activeCons.patientPid || 'P1245';
    const normPid = rawPid.startsWith('#') ? rawPid : '#' + rawPid;
    const pName = activeCons.patientName || 'Patient';
    const pInitials = pName ? pName.split(' ').map(n => n[0]).join('') : 'PT';

    const formData = new FormData();
    formData.append('file', session.recordedFile, session.recordedFile.name);
    formData.append('encounter_id', session.metadata.encounterId);
    formData.append('doctor_id', session.metadata.doctorId);
    formData.append('patient_id', normPid);
    formData.append('doctor_name', 'Dr. Yuki Tanaka');
    formData.append('patient_name', pName);
    formData.append('doctor_initials', 'YT');
    formData.append('patient_initials', pInitials);
    formData.append('recording_started_at', session.metadata.recordingStartedAt);
    formData.append('recording_ended_at', session.metadata.recordingEndedAt);
    formData.append('duration_seconds', session.metadata.durationSeconds.toString());
    formData.append('auto_transcribe', 'true');

    const url = `${environment.apiBaseUrl}${environment.recordingEndpoint}`;
    return this.http.post<RecordingUploadResponse>(url, formData).pipe(
      tap((res) => {
        this.updateSessionStatus(session.id, 'UPLOADED');
        if (res.gdriveWebViewLink) {
          this.gdriveWebViewLink.set(res.gdriveWebViewLink);
        }
        if (res.gdriveFileId) {
          this.gdriveFileId.set(res.gdriveFileId);
        }
        if (res.transcript) {
          this.latestTranscript.set(res.transcript);
        }
        if (res.exchanges && res.exchanges.length > 0) {
          this.latestExchanges.set(res.exchanges);
        }
        const suggestions = res.ai_suggestions || res.aiSuggestions;
        if (suggestions && suggestions.length > 0) {
          this.latestSuggestions.set(suggestions);
        }
        const analysis = res.clinical_analysis || res.clinicalAnalysis;
        if (analysis) {
          this.latestClinicalAnalysis.set(analysis);
        }

        // Sync with active consultation details
        if (res.exchanges && res.exchanges.length > 0) {
          this.mockData.activeConsultation.update(prev => ({
            ...prev,
            transcript: res.exchanges!.map(e => ({
              speaker: e.isDoctor ? 'Doctor' : 'Patient',
              text: e.text,
              timestamp: e.timestamp || '00:00'
            })),
            wordCount: res.transcript ? res.transcript.split(/\s+/).length : prev.wordCount,
            soapNote: res.soap_report ? {
              subjective: res.soap_report.subjective || prev.soapNote.subjective,
              objective: res.soap_report.objective || prev.soapNote.objective,
              assessment: res.soap_report.assessment || prev.soapNote.assessment,
              plan: res.soap_report.plan || prev.soapNote.plan,
            } : prev.soapNote
          }));
        }

        this.saveCurrentPatientSession(normPid);
        if (this.currentPatientId) {
          this.saveCurrentPatientSession(this.currentPatientId);
        }
      }),
      catchError((error) => {
        const errorMsg = error.error?.detail || error.message || 'Upload failed.';
        this.updateSessionStatus(session.id, 'FAILED', errorMsg);
        return throwError(() => error);
      })
    );
  }

  /**
   * Downloads an individual recorded session item.
   */
  downloadSessionItem(session: RecordedSessionItem): void {
    if (!session.audioUrl || typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = session.audioUrl;
    a.download = session.metadata.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Updates status of a session item in history list.
   */
  updateSessionStatus(id: string, status: 'READY' | 'UPLOADING' | 'UPLOADED' | 'FAILED', errorMsg?: string): void {
    this.recordedSessions.update(list => list.map(item => item.id === id ? { ...item, status, errorMessage: errorMsg } : item));
  }

  /**
   * Deletes an individual session from history by ID.
   */
  deleteSession(sessionId: string): void {
    const target = this.recordedSessions().find(s => s.id === sessionId);
    if (target?.audioUrl) {
      try {
        URL.revokeObjectURL(target.audioUrl);
      } catch (e) {}
    }
    this.recordedSessions.update(list => list.filter(s => s.id !== sessionId));

    const remaining = this.recordedSessions();
    if (remaining.length === 0) {
      this.resetToInitialState();
    } else {
      const latest = remaining[remaining.length - 1];
      this.durationSeconds.set(latest.durationSeconds);
      this.audioUrl.set(latest.audioUrl);
      this.recordedBlob.set(latest.recordedBlob);
      this.recordedFile.set(latest.recordedFile);
      this.sessionMetadata.set(latest.metadata);
      this.sessionTitle.set(latest.sessionTitle);
      this.state.set('READY_TO_UPLOAD');
    }
  }

  /**
   * Clears all recorded sessions from history.
   */
  clearAllSessions(): void {
    this.recordedSessions().forEach(s => {
      if (s.audioUrl) {
        try {
          URL.revokeObjectURL(s.audioUrl);
        } catch (e) {}
      }
    });
    this.recordedSessions.set([]);
    this.resetToInitialState();
  }

  /**
   * Deletes the active in-progress or unsaved recording session.
   */
  deleteCurrentRecording(): void {
    const url = this.audioUrl();
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    }
    this.recordedBlob.set(null);
    this.recordedFile.set(null);
    this.audioUrl.set(null);
    this.sessionMetadata.set(null);
    this.durationSeconds.set(0);
    this.state.set('IDLE');

    if (this.recordedSessions().length === 0) {
      this.resetToInitialState();
    }
  }

  /**
   * Completely resets to pristine initial state (Session 1, IDLE, 0s).
   */
  resetToInitialState(): void {
    this.cleanupRecording();
    this.state.set('IDLE');
    this.durationSeconds.set(0);
    this.errorMessage.set(null);
    this.recordedBlob.set(null);
    this.recordedFile.set(null);
    this.audioUrl.set(null);
    this.sessionMetadata.set(null);
    this.sessionNumber.set(1);
    this.sessionTitle.set('Session 1');
    if (this.currentPatientId) {
      this.saveCurrentPatientSession(this.currentPatientId);
    }
  }

  /**
   * Switches active patient session context.
   * Isolates recordings, transcripts, AI suggestions, and analysis per patient ID.
   */
  switchPatient(patientId: string): void {
    const normPid = patientId.startsWith('#') ? patientId : '#' + patientId;
    const rawPid = patientId.replace('#', '');

    if (this.currentPatientId === normPid || this.currentPatientId === rawPid) {
      return;
    }

    // Stop ongoing recording if any
    if (this.state() === 'RECORDING' || this.state() === 'PAUSED') {
      try {
        this.stopTimer();
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
        this.stopMicrophoneTracks();
      } catch (e) {}
    }

    // Save previous patient session
    if (this.currentPatientId) {
      this.saveCurrentPatientSession(this.currentPatientId);
    }

    this.currentPatientId = normPid;

    const saved = this.patientSessionsMap.get(normPid) || this.patientSessionsMap.get(rawPid) || this.patientSessionsMap.get(patientId);

    if (saved) {
      // Restore this specific patient's saved recording session data
      this.state.set(saved.state || 'IDLE');
      this.durationSeconds.set(saved.durationSeconds || 0);
      this.recordedBlob.set(saved.recordedBlob || null);
      this.recordedFile.set(saved.recordedFile || null);
      this.audioUrl.set(saved.audioUrl || null);
      this.sessionMetadata.set(saved.sessionMetadata || null);
      this.latestTranscript.set(saved.latestTranscript || '');
      this.latestExchanges.set(saved.latestExchanges || []);
      this.latestSuggestions.set(saved.latestSuggestions || []);
      this.latestClinicalAnalysis.set(saved.latestClinicalAnalysis || null);
      this.gdriveWebViewLink.set(saved.gdriveWebViewLink || null);
      this.gdriveFileId.set(saved.gdriveFileId || null);
      this.recordedSessions.set(saved.recordedSessions || []);
      this.sessionNumber.set(saved.sessionNumber || 1);
      this.sessionTitle.set(saved.sessionTitle || 'Session 1');
      this.errorMessage.set(null);
    } else {
      // Clean slate for new / unrecorded patient
      this.state.set('IDLE');
      this.durationSeconds.set(0);
      this.errorMessage.set(null);
      this.recordedBlob.set(null);
      this.recordedFile.set(null);
      this.audioUrl.set(null);
      this.sessionMetadata.set(null);
      this.latestTranscript.set('');
      this.latestExchanges.set([]);
      this.latestSuggestions.set([]);
      this.latestClinicalAnalysis.set(null);
      this.gdriveWebViewLink.set(null);
      this.gdriveFileId.set(null);
      this.recordedSessions.set([]);
      this.sessionNumber.set(1);
      this.sessionTitle.set('Session 1');
    }
  }

  /**
   * Persists active signals into patient-isolated storage map.
   */
  saveCurrentPatientSession(patientIdOverride?: string): void {
    const pid = patientIdOverride || this.currentPatientId;
    if (!pid) return;

    this.patientSessionsMap.set(pid, {
      patientId: pid,
      state: this.state(),
      durationSeconds: this.durationSeconds(),
      recordedBlob: this.recordedBlob(),
      recordedFile: this.recordedFile(),
      audioUrl: this.audioUrl(),
      sessionMetadata: this.sessionMetadata(),
      latestTranscript: this.latestTranscript(),
      latestExchanges: this.latestExchanges(),
      latestSuggestions: this.latestSuggestions(),
      latestClinicalAnalysis: this.latestClinicalAnalysis(),
      gdriveWebViewLink: this.gdriveWebViewLink(),
      gdriveFileId: this.gdriveFileId(),
      recordedSessions: this.recordedSessions(),
      sessionNumber: this.sessionNumber(),
      sessionTitle: this.sessionTitle()
    });
  }

  /**
   * Analyzes conversation turns directly via backend endpoint.
   */
  analyzeConversation(conversationTurns: any[], transcriptText: string = ''): Observable<any> {
    const url = `${environment.apiBaseUrl}/analyze-conversation`;
    return this.http.post<any>(url, {
      conversation: conversationTurns,
      transcript: transcriptText
    }).pipe(
      tap((res) => {
        if (res.ai_suggestions || res.aiSuggestions) {
          this.latestSuggestions.set(res.ai_suggestions || res.aiSuggestions);
        }
        if (res.clinical_analysis || res.clinicalAnalysis) {
          this.latestClinicalAnalysis.set(res.clinical_analysis || res.clinicalAnalysis);
        } else {
          this.latestClinicalAnalysis.set({
            summary: res.summary,
            entities: res.entities,
            differential_diagnosis: res.differential_diagnosis,
            soap_report: res.soap_report,
            ai_suggestions: res.ai_suggestions
          });
        }
        if (this.currentPatientId) {
          this.saveCurrentPatientSession(this.currentPatientId);
        }
      })
    );
  }

  /**
   * Resets recording state and cleans up resources for the next new session.
   */
  resetState(): void {
    this.cleanupRecording();
    this.state.set('IDLE');
    this.durationSeconds.set(0);
    this.errorMessage.set(null);
    this.recordedBlob.set(null);
    this.recordedFile.set(null);
    this.sessionMetadata.set(null);
    this.sessionNumber.update(num => num + 1);
    this.sessionTitle.set(`Session ${this.sessionNumber()}`);
  }

  // Session tracking signal (e.g. Session 1, Session 2, etc.)
  readonly sessionNumber = signal<number>(1);
  readonly sessionTitle = signal<string>('Session 1');

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.state() === 'RECORDING') {
        const nextDuration = this.durationSeconds() + 1;
        this.durationSeconds.set(nextDuration);

        // Auto-stop when reaching max 20 minutes (1200s)
        if (nextDuration >= this.MAX_DURATION_SECONDS) {
          this.stopRecording();
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private cleanupRecording(): void {
    this.stopTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.stopMicrophoneTracks();
  }
}
