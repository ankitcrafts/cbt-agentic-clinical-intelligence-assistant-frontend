export type RecordingState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'RECORDING'
  | 'PAUSED'
  | 'READY_TO_UPLOAD'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'FAILED';

export interface RecordingSessionMetadata {
  encounterId: string;
  doctorId: string;
  patientId: string;
  recordingStartedAt: string; // ISO string
  recordingEndedAt: string;   // ISO string
  durationSeconds: number;
  mimeType: string;
  fileName: string;
  fileSize: number;
}

export interface RecordingUploadResponse {
  id: string;
  status: string;
  encounterId: string;
  audioUrl?: string;
  message?: string;
}
