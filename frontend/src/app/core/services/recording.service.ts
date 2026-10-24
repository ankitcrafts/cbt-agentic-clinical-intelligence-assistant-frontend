import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, map, tap } from 'rxjs/operators';
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
  ClinicalAnalysisData,
  ConsultationMode,
  AudioSourceType
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

  // Consultation Mode & Audio Source Signals
  readonly consultationMode = signal<ConsultationMode>('IN_PERSON');
  readonly audioSourceType = signal<AudioSourceType>('MIC');

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
  private teleconsultationDisplayStream: MediaStream | null = null;
  private teleconsultationMicStream: MediaStream | null = null;
  private teleconsultationAudioContext: any = null;
  private audioChunks: Blob[] = [];
  private timerInterval: any = null;
  private startTimeIso: string | null = null;
  private endTimeIso: string | null = null;

  constructor() {}

  ngOnDestroy(): void {
    this.cleanupRecording();
  }

  /**
   * Sets consultation mode ('IN_PERSON', 'TELECONSULTATION', 'REMOTE_TEAMS', 'REMOTE_MEET', 'REMOTE_WHATSAPP', 'FILE_UPLOAD').
   */
  setConsultationMode(mode: ConsultationMode): void {
    this.consultationMode.set(mode);
    if (this.state() === 'FAILED') {
      this.state.set('IDLE');
      this.errorMessage.set(null);
    }
  }

  /**
   * Resets error and failed state to IDLE.
   */
  resetFailedState(): void {
    if (this.state() === 'FAILED') {
      this.state.set('IDLE');
      this.errorMessage.set(null);
    }
  }

  /**
   * Sets audio source type ('MIC', 'SYSTEM_MIXED', 'FILE_UPLOAD').
   */
  setAudioSourceType(source: AudioSourceType): void {
    this.audioSourceType.set(source);
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
   * Starts recording based on current consultation mode.
   * - In-Person: Captures local microphone.
   * - Teleconsultation (Teams / Meet / WhatsApp): Captures system/tab audio + doctor microphone and mixes them via Web Audio API.
   */
  async startRecording(
    context?: { encounterId?: string; doctorId?: string; patientId?: string },
    modeOverride?: ConsultationMode
  ): Promise<void> {
    this.errorMessage.set(null);
    this.state.set('REQUESTING_PERMISSION');

    if (modeOverride) {
      this.consultationMode.set(modeOverride);
    }
    const mode = this.consultationMode();

    if (mode === 'FILE_UPLOAD') {
      this.audioSourceType.set('FILE_UPLOAD');
      this.state.set('IDLE');
      return;
    }

    try {
      if (mode === 'IN_PERSON') {
        // 1. In-Person Consultation (Microphone only)
        this.audioSourceType.set('MIC');
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          const isHttpInsecure = typeof window !== 'undefined' && !window.isSecureContext;
          const host = typeof window !== 'undefined' ? window.location.host : '';
          const err = isHttpInsecure
            ? `Microphone access is blocked by your browser on unencrypted HTTP (${host}). Please access via HTTPS (https://${host}/), use the Upload File tab, or enable chrome://flags/#unsafely-treat-insecure-origin-as-secure.`
            : 'Microphone access is not supported by your browser environment.';
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
      } else {
        // 2. Remote Teleconsultation (Teams, Google Meet, WhatsApp, Zoom)
        // Captures tab/system audio (Patient voice) + local mic (Doctor voice) and mixes them in real-time
        this.audioSourceType.set('SYSTEM_MIXED');

        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
          const isHttpInsecure = typeof window !== 'undefined' && !window.isSecureContext;
          const host = typeof window !== 'undefined' ? window.location.host : '';
          const err = isHttpInsecure
            ? `Screen/Tab system audio capture is blocked by your browser on unencrypted HTTP (${host}). Please access via HTTPS (https://${host}/), use the Upload File tab, or enable chrome://flags/#unsafely-treat-insecure-origin-as-secure.`
            : 'Screen/Tab system audio capture is not supported by your browser. Please use Google Chrome, Microsoft Edge, or Firefox.';
          this.errorMessage.set(err);
          this.state.set('FAILED');
          throw new Error(err);
        }

        try {
          // Request Display Media with Audio track from the Teams/Meet/WhatsApp tab/window
          this.teleconsultationDisplayStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch (err: any) {
          const msg = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            ? 'Teleconsultation capture cancelled. Please select your Teams, Google Meet, or WhatsApp tab/window and enable "Share audio".'
            : `Teleconsultation setup error: ${err.message || 'Unable to capture remote call audio.'}`;
          this.errorMessage.set(msg);
          this.state.set('FAILED');
          this.stopMicrophoneTracks();
          throw err;
        }

        const displayAudioTracks = this.teleconsultationDisplayStream.getAudioTracks();
        if (displayAudioTracks.length === 0) {
          this.stopMicrophoneTracks();
          const err = 'No audio track detected from the selected screen/tab! Please ensure you check "Share audio" or "Also share tab audio" when choosing the Teams/Meet/WhatsApp tab.';
          this.errorMessage.set(err);
          this.state.set('FAILED');
          throw new Error(err);
        }

        // Simultaneously capture Doctor's local microphone
        try {
          this.teleconsultationMicStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch (micErr) {
          console.warn('Doctor mic access warning during teleconsultation setup, proceeding with remote call audio only:', micErr);
        }

        // Mix remote call audio and doctor microphone using Web Audio API AudioContext
        try {
          const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          const destNode = audioCtx.createMediaStreamDestination();

          // Connect remote call audio (patient)
          const displaySource = audioCtx.createMediaStreamSource(this.teleconsultationDisplayStream);
          const displayGain = audioCtx.createGain();
          displayGain.gain.value = 1.0;
          displaySource.connect(displayGain);
          displayGain.connect(destNode);

          // Connect doctor microphone
          if (this.teleconsultationMicStream && this.teleconsultationMicStream.getAudioTracks().length > 0) {
            const micSource = audioCtx.createMediaStreamSource(this.teleconsultationMicStream);
            const micGain = audioCtx.createGain();
            micGain.gain.value = 1.0;
            micSource.connect(micGain);
            micGain.connect(destNode);
          }

          this.teleconsultationAudioContext = audioCtx;
          this.mediaStream = destNode.stream;
        } catch (mixErr: any) {
          console.warn('AudioContext mixing fallback to display stream:', mixErr);
          this.mediaStream = this.teleconsultationDisplayStream;
        }

        // Stop recording if the doctor ends the browser tab sharing session
        this.teleconsultationDisplayStream.getVideoTracks().forEach(track => {
          track.onended = () => {
            if (this.state() === 'RECORDING' || this.state() === 'PAUSED') {
              this.stopRecording(context);
            }
          };
        });
      }
    } catch (setupErr) {
      this.stopMicrophoneTracks();
      throw setupErr;
    }

    const detectedMimeType = this.getSupportedMimeType();
    this.mimeType.set(detectedMimeType || 'audio/wav');

    try {
      const options = detectedMimeType ? { mimeType: detectedMimeType } : {};
      this.mediaRecorder = new MediaRecorder(this.mediaStream!, options);
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
   * Handles pre-recorded audio file upload (from Teams, Google Meet, WhatsApp, or Zoom recording).
   */
  async handleUploadedAudioFile(
    file: File,
    context?: { encounterId?: string; doctorId?: string; patientId?: string }
  ): Promise<void> {
    if (!file) return;

    this.cleanupRecording();
    this.consultationMode.set('FILE_UPLOAD');
    this.audioSourceType.set('FILE_UPLOAD');
    this.errorMessage.set(null);

    const previewUrl = URL.createObjectURL(file);
    let duration = 0;

    // Detect duration using audio element
    try {
      duration = await new Promise<number>((resolve) => {
        const tempAudio = new Audio();
        tempAudio.src = previewUrl;
        tempAudio.onloadedmetadata = () => {
          resolve(Math.round(tempAudio.duration) || 60);
        };
        tempAudio.onerror = () => {
          resolve(60);
        };
      });
    } catch (e) {
      duration = 60;
    }

    this.durationSeconds.set(duration);
    this.mimeType.set(file.type || 'audio/wav');
    this.recordedBlob.set(file);
    this.recordedFile.set(file);
    this.audioUrl.set(previewUrl);

    const encounterId = context?.encounterId || this.mockData.activeConsultation().id || 'CONS-41233';
    const doctorId = context?.doctorId || this.authService.currentUser()?.id || 'DOC-001';
    const patientId = context?.patientId || this.mockData.activeConsultation().patientPid || 'P1245';

    const metadata: RecordingSessionMetadata = {
      encounterId,
      doctorId,
      patientId,
      recordingStartedAt: new Date().toISOString(),
      recordingEndedAt: new Date().toISOString(),
      durationSeconds: duration,
      mimeType: file.type || 'audio/wav',
      fileName: file.name,
      fileSize: file.size,
      consultationMode: 'FILE_UPLOAD',
      audioSource: 'FILE_UPLOAD'
    };

    const sessionItem: RecordedSessionItem = {
      id: `session_${Date.now()}_${this.sessionNumber()}`,
      sessionNumber: this.sessionNumber(),
      sessionTitle: `${this.sessionTitle()} (Uploaded Call File)`,
      durationSeconds: duration,
      formattedDuration: this.formatDuration(duration),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recordedBlob: file,
      recordedFile: file,
      audioUrl: previewUrl,
      metadata,
      consultationMode: 'FILE_UPLOAD',
      audioSource: 'FILE_UPLOAD',
      status: 'READY'
    };

    this.sessionMetadata.set(metadata);
    this.recordedSessions.update(list => [...list, sessionItem]);
    this.state.set('READY_TO_UPLOAD');
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
        const doctorId = context?.doctorId || this.authService.currentUser()?.id || 'DOC-001';
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
          fileSize: finalBlob.size,
          consultationMode: this.consultationMode(),
          audioSource: this.audioSourceType()
        };

        const sessionItem: RecordedSessionItem = {
          id: `session_${Date.now()}_${this.sessionNumber()}`,
          sessionNumber: this.sessionNumber(),
          sessionTitle: `${this.sessionTitle()}${this.consultationMode() !== 'IN_PERSON' ? ' (Teleconsultation)' : ''}`,
          durationSeconds: metadata.durationSeconds,
          formattedDuration: this.formatDuration(metadata.durationSeconds),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recordedBlob: finalBlob,
          recordedFile: file,
          audioUrl: previewUrl,
          metadata,
          consultationMode: this.consultationMode(),
          audioSource: this.audioSourceType(),
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
    const currentUser = this.authService.currentUser();
    const encounterId = overrideContext?.encounterId || metadata.encounterId || activeCons.id || 'CONS-41233';
    const doctorId = overrideContext?.doctorId || metadata.doctorId || currentUser?.id || 'DOC-001';
    const patientId = overrideContext?.patientId || metadata.patientId || activeCons.patientPid || 'P1245';
    const doctorName = overrideContext?.doctorName || currentUser?.name || 'Dr. Yuki Tanaka';
    const patientName = overrideContext?.patientName || activeCons.patientName || 'Marcus Delgado';
    const doctorInitials = overrideContext?.doctorInitials || currentUser?.avatar_initials || 'YT';
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
    formData.append('consultation_mode', metadata.consultationMode || this.consultationMode() || 'IN_PERSON');
    formData.append('audio_source', metadata.audioSource || this.audioSourceType() || 'MIC');
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
          const mergedAnalysis = {
            ...analysis,
            differential_diagnosis: analysis.differential_diagnosis || analysis.differentialDiagnosis || res.differential_diagnosis || res.differentialDiagnosis,
            guideline_medicines: analysis.guideline_medicines || analysis.guidelineMedicines || res.guideline_medicines || res.guidelineMedicines,
            red_flags: analysis.red_flags || analysis.redFlags || res.red_flags || res.redFlags,
            confidence_metrics: analysis.confidence_metrics || analysis.confidenceMetrics || res.confidence_metrics || res.confidenceMetrics,
            follow_up_questions: analysis.follow_up_questions || analysis.followUpQuestions || res.follow_up_questions || res.followUpQuestions,
            guideline_follow_up_questions: analysis.guideline_follow_up_questions || analysis.guidelineFollowUpQuestions || res.guideline_follow_up_questions || res.guidelineFollowUpQuestions,
            soap_report: analysis.soap_report || analysis.soapReport || res.soap_report || res.soapReport,
          };
          this.latestClinicalAnalysis.set(mergedAnalysis);
        } else if (res.summary || res.differential_diagnosis || res.soap_report) {
          this.latestClinicalAnalysis.set({
            summary: res.summary,
            entities: res.entities,
            differential_diagnosis: res.differential_diagnosis || res.differentialDiagnosis,
            guideline_medicines: res.guideline_medicines || res.guidelineMedicines,
            red_flags: res.red_flags || res.redFlags,
            confidence_metrics: res.confidence_metrics || res.confidenceMetrics,
            follow_up_questions: res.follow_up_questions || res.followUpQuestions,
            guideline_follow_up_questions: res.guideline_follow_up_questions || res.guidelineFollowUpQuestions,
            soap_report: res.soap_report || res.soapReport,
            ai_suggestions: res.ai_suggestions || res.aiSuggestions
          });
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
   * Stops all active microphone & teleconsultation display hardware tracks to release hardware indicator.
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
    if (this.teleconsultationDisplayStream) {
      this.teleconsultationDisplayStream.getTracks().forEach((track) => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      this.teleconsultationDisplayStream = null;
    }
    if (this.teleconsultationMicStream) {
      this.teleconsultationMicStream.getTracks().forEach((track) => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      this.teleconsultationMicStream = null;
    }
    if (this.teleconsultationAudioContext) {
      try {
        this.teleconsultationAudioContext.close();
      } catch (e) {}
      this.teleconsultationAudioContext = null;
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
    const currentUser = this.authService.currentUser();
    const docId = session.metadata.doctorId || currentUser?.id || 'DOC-001';
    const docName = currentUser?.name || 'Dr. Yuki Tanaka';
    const docInitials = currentUser?.avatar_initials || 'DOC';

    const formData = new FormData();
    formData.append('file', session.recordedFile, session.recordedFile.name);
    formData.append('encounter_id', session.metadata.encounterId);
    formData.append('doctor_id', docId);
    formData.append('patient_id', normPid);
    formData.append('doctor_name', docName);
    formData.append('patient_name', pName);
    formData.append('doctor_initials', docInitials);
    formData.append('patient_initials', pInitials);
    formData.append('recording_started_at', session.metadata.recordingStartedAt);
    formData.append('recording_ended_at', session.metadata.recordingEndedAt);
    formData.append('duration_seconds', session.metadata.durationSeconds.toString());
    formData.append('consultation_mode', session.consultationMode || session.metadata.consultationMode || this.consultationMode() || 'IN_PERSON');
    formData.append('audio_source', session.audioSource || session.metadata.audioSource || this.audioSourceType() || 'MIC');
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
          const mergedAnalysis = {
            ...analysis,
            differential_diagnosis: analysis.differential_diagnosis || analysis.differentialDiagnosis || res.differential_diagnosis || res.differentialDiagnosis,
            guideline_medicines: analysis.guideline_medicines || analysis.guidelineMedicines || res.guideline_medicines || res.guidelineMedicines,
            red_flags: analysis.red_flags || analysis.redFlags || res.red_flags || res.redFlags,
            confidence_metrics: analysis.confidence_metrics || analysis.confidenceMetrics || res.confidence_metrics || res.confidenceMetrics,
            follow_up_questions: analysis.follow_up_questions || analysis.followUpQuestions || res.follow_up_questions || res.followUpQuestions,
            guideline_follow_up_questions: analysis.guideline_follow_up_questions || analysis.guidelineFollowUpQuestions || res.guideline_follow_up_questions || res.guidelineFollowUpQuestions,
            soap_report: analysis.soap_report || analysis.soapReport || res.soap_report || res.soapReport,
          };
          this.latestClinicalAnalysis.set(mergedAnalysis);
        } else if (res.summary || res.differential_diagnosis || res.soap_report) {
          this.latestClinicalAnalysis.set({
            summary: res.summary,
            entities: res.entities,
            differential_diagnosis: res.differential_diagnosis || res.differentialDiagnosis,
            guideline_medicines: res.guideline_medicines || res.guidelineMedicines,
            red_flags: res.red_flags || res.redFlags,
            confidence_metrics: res.confidence_metrics || res.confidenceMetrics,
            follow_up_questions: res.follow_up_questions || res.followUpQuestions,
            guideline_follow_up_questions: res.guideline_follow_up_questions || res.guidelineFollowUpQuestions,
            soap_report: res.soap_report || res.soapReport,
            ai_suggestions: res.ai_suggestions || res.aiSuggestions
          });
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
      this.consultationMode.set(saved.consultationMode || 'IN_PERSON');
      this.audioSourceType.set(saved.audioSourceType || 'MIC');
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
      this.consultationMode.set('IN_PERSON');
      this.audioSourceType.set('MIC');
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
      consultationMode: this.consultationMode(),
      audioSourceType: this.audioSourceType(),
      sessionNumber: this.sessionNumber(),
      sessionTitle: this.sessionTitle()
    });
  }

  /**
   * Analyzes conversation turns directly via backend endpoint.
   */
  analyzeConversation(conversationTurns: any[], transcriptText: string = '', metadata?: { doctorName?: string; patientName?: string; doctorInitials?: string; patientInitials?: string; visitId?: string }): Observable<any> {
    const url = `${environment.apiBaseUrl}/analyze-conversation`;
    const payload: any = {
      conversation: conversationTurns,
      transcript: transcriptText
    };
    if (metadata) {
      if (metadata.doctorName) payload.doctor_name = metadata.doctorName;
      if (metadata.patientName) payload.patient_name = metadata.patientName;
      if (metadata.doctorInitials) payload.doctor_initials = metadata.doctorInitials;
      if (metadata.patientInitials) payload.patient_initials = metadata.patientInitials;
      if (metadata.visitId) payload.visit_id = metadata.visitId;
    }
    return this.http.post<any>(url, payload).pipe(
      tap((res) => {
        if (res.ai_suggestions || res.aiSuggestions) {
          this.latestSuggestions.set(res.ai_suggestions || res.aiSuggestions);
        }
        const analysis = res.clinical_analysis || res.clinicalAnalysis;
        const mergedAnalysis = {
          ...(analysis || {}),
          summary: analysis?.summary || res.summary,
          entities: analysis?.entities || res.entities,
          differential_diagnosis: analysis?.differential_diagnosis || analysis?.differentialDiagnosis || res.differential_diagnosis || res.differentialDiagnosis || [],
          guideline_medicines: analysis?.guideline_medicines || analysis?.guidelineMedicines || res.guideline_medicines || res.guidelineMedicines || [],
          red_flags: analysis?.red_flags || analysis?.redFlags || res.red_flags || res.redFlags || [],
          confidence_metrics: analysis?.confidence_metrics || analysis?.confidenceMetrics || res.confidence_metrics || res.confidenceMetrics || {},
          follow_up_questions: analysis?.follow_up_questions || analysis?.followUpQuestions || res.follow_up_questions || res.followUpQuestions || [],
          guideline_follow_up_questions: analysis?.guideline_follow_up_questions || analysis?.guidelineFollowUpQuestions || res.guideline_follow_up_questions || res.guidelineFollowUpQuestions || [],
          soap_report: analysis?.soap_report || analysis?.soapReport || res.soap_report || res.soapReport || {},
          ai_suggestions: analysis?.ai_suggestions || analysis?.aiSuggestions || res.ai_suggestions || res.aiSuggestions || []
        };
        this.latestClinicalAnalysis.set(mergedAnalysis);
        if (this.currentPatientId) {
          this.saveCurrentPatientSession(this.currentPatientId);
        }
      })
    );
  }

  /**
   * Reframes a specific section of the SOAP report using AI based on doctor instructions.
   */
  reframeSOAPSection(section: string, originalContent: string, editReason: string, fullSoap?: any): Observable<any> {
    const payload = {
      section,
      original_content: originalContent,
      edit_reason: editReason,
      full_soap: fullSoap
    };
    const baseUrl = environment.apiBaseUrl || 'http://127.0.0.1:8000';
    return this.http.post<any>(`${baseUrl}/api/v1/soap/reframe`, payload).pipe(
      catchError(err => {
        // Fallback endpoint if version path is different
        return this.http.post<any>(`${baseUrl}/soap/reframe`, payload);
      })
    );
  }

  /**
   * Saves finalized SOAP note edits, reason, and patient summary feedback to database for fine-tuning.
   */
  saveSOAPFeedback(payload: {
    encounter_id: string;
    doctor_id?: string;
    patient_id?: string;
    original_soap: any;
    edited_soap: any;
    edit_reason?: string;
    edited_section?: string;
    patient_summary?: string;
    is_finalized?: boolean;
  }): Observable<any> {
    const baseUrl = environment.apiBaseUrl || 'http://127.0.0.1:8000';
    return this.http.post<any>(`${baseUrl}/api/v1/soap/feedback`, payload).pipe(
      catchError(err => {
        return this.http.post<any>(`${baseUrl}/soap/feedback`, payload);
      })
    );
  }

  /**
   * Retrieves saved SOAP feedback history for an encounter.
   */
  fetchSOAPFeedback(encounterId: string): Observable<any> {
    const baseUrl = environment.apiBaseUrl || 'http://127.0.0.1:8000';
    return this.http.get<any>(`${baseUrl}/api/v1/soap/feedback/${encounterId}`).pipe(
      catchError(err => {
        return this.http.get<any>(`${baseUrl}/soap/feedback/${encounterId}`);
      })
    );
  }

  /**
   * Fetches stored consultation sessions for a patient from database.
   */
  getPatientConsultationSessions(patientId: string): Observable<any[]> {
    const baseUrl = environment.apiBaseUrl || 'http://127.0.0.1:8000';
    const cleanPid = patientId.startsWith('#') ? patientId : '#' + patientId;
    return this.http.get<any>(`${baseUrl}/api/v1/patients/${encodeURIComponent(cleanPid)}/sessions`).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.data || [])),
      catchError(() => {
        return this.http.get<any>(`${baseUrl}/api/scheduling/patients/${encodeURIComponent(cleanPid)}/sessions`).pipe(
          map((res: any) => Array.isArray(res) ? res : (res?.data || []))
        );
      }),
      catchError(() => {
        return this.http.get<any>(`${baseUrl}/patients/${encodeURIComponent(cleanPid)}/sessions`).pipe(
          map((res: any) => Array.isArray(res) ? res : (res?.data || []))
        );
      }),
      catchError(err => {
        console.warn('Failed to fetch patient consultation sessions from backend:', err);
        return of([]);
      })
    );
  }

  /**
   * Clears any active unclosed recording draft for a specific patient upon consultation closure or rescheduling.
   */
  clearPatientLiveDraft(patientId: string): void {
    if (!patientId) return;
    const normPid = patientId.startsWith('#') ? patientId : '#' + patientId;
    const rawPid = patientId.replace('#', '');
    this.patientSessionsMap.delete(normPid);
    this.patientSessionsMap.delete(rawPid);
    this.patientSessionsMap.delete(patientId);
  }

  /**
   * Resets all recorded data, live transcript, and CDS intelligence for a patient
   * to ensure a 100% fresh start upon new appointment scheduling, rescheduling, or new session start.
   */
  resetPatientState(patientId: string): void {
    if (!patientId) return;
    const normPid = patientId.startsWith('#') ? patientId : '#' + patientId;
    const rawPid = patientId.replace('#', '');

    this.clearPatientLiveDraft(patientId);

    if (this.currentPatientId === normPid || this.currentPatientId === rawPid || this.currentPatientId === patientId) {
      this.cleanupRecording();
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
      this.consultationMode.set('IN_PERSON');
      this.audioSourceType.set('MIC');
      this.sessionNumber.set(1);
      this.sessionTitle.set('Session 1');
    }
  }

  /**
   * Fetches single consultation session details by ID.
   */
  getConsultationSessionDetail(sessionId: string): Observable<any> {
    const baseUrl = environment.apiBaseUrl || 'http://127.0.0.1:8000';
    return this.http.get<any>(`${baseUrl}/api/v1/sessions/${encodeURIComponent(sessionId)}`).pipe(
      catchError(() => {
        return this.http.get<any>(`${baseUrl}/sessions/${encodeURIComponent(sessionId)}`);
      })
    );
  }

  /**
   * Loads a consultation session (e.g. Session 1 history) into the active dashboard state.
   */
  loadConsultationSession(session: any): void {
    if (!session) return;
    this.sessionNumber.set(session.sessionNumber || session.session_number || 1);
    this.sessionTitle.set(session.sessionTitle || session.session_title || `Session ${session.sessionNumber || session.session_number || 1}`);
    this.latestTranscript.set(session.transcript || '');
    this.latestExchanges.set(session.conversation || []);

    const suggestions = session.aiSuggestions 
      || session.ai_suggestions 
      || session.clinicalAnalysis?.ai_suggestions 
      || session.clinicalAnalysis?.aiSuggestions 
      || session.clinical_analysis?.ai_suggestions 
      || session.clinical_analysis?.aiSuggestions 
      || [];
    this.latestSuggestions.set(suggestions);

    const analysis = session.clinicalAnalysis || session.clinical_analysis || null;
    this.latestClinicalAnalysis.set(analysis);
    this.gdriveWebViewLink.set(session.gdriveWebViewLink || session.gdrive_web_view_link || null);
    this.gdriveFileId.set(session.gdriveFileId || session.gdrive_file_id || null);

    // Synchronize mock data state
    this.mockData.activeConsultation.update(prev => ({
      ...prev,
      transcript: (session.conversation || []).map((e: any) => ({
        speaker: e.isDoctor ? 'Doctor' : (e.speaker || 'Patient'),
        text: e.text,
        timestamp: e.timestamp || '00:00'
      })),
      wordCount: session.transcript ? session.transcript.split(/\s+/).length : prev.wordCount,
      soapNote: session.soapReport || session.soap_report || prev.soapNote
    }));
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
