export type RecordingState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'RECORDING'
  | 'PAUSED'
  | 'READY_TO_UPLOAD'
  | 'UPLOADING'
  | 'TRANSCRIBING'
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

export interface TranscriptExchange {
  id: number;
  speaker: string;
  speakerName: string;
  isDoctor: boolean;
  text: string;
  timestamp?: string;
  start?: number;
  end?: number;
}

export interface AISuggestion {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
}

export interface DifferentialDiagnosisItem {
  name: string;
  confidence: number;
  reason: string;
  missing_information?: string[];
}

export interface ClinicalAnalysisData {
  summary?: any;
  entities?: any;
  differential_diagnosis?: DifferentialDiagnosisItem[] | any;
  soap_report?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  ai_suggestions?: AISuggestion[];
}

export interface RecordingUploadResponse {
  id: string;
  status: string;
  encounterId: string;
  doctorId?: string;
  patientId?: string;
  fileName?: string;
  fileSize?: number;
  durationSeconds?: number;
  gdriveUploaded?: boolean;
  gdriveFileId?: string;
  gdriveWebViewLink?: string;
  gdriveFolderId?: string;
  transcript?: string;
  exchanges?: TranscriptExchange[];
  ai_suggestions?: AISuggestion[];
  aiSuggestions?: AISuggestion[];
  summary?: any;
  entities?: any;
  differential_diagnosis?: any;
  soap_report?: any;
  clinical_analysis?: ClinicalAnalysisData;
  clinicalAnalysis?: ClinicalAnalysisData;
  audioUrl?: string;
  message?: string;
}

export interface RecordedSessionItem {
  id: string;
  sessionNumber: number;
  sessionTitle: string;
  durationSeconds: number;
  formattedDuration: string;
  timestamp: string;
  recordedBlob: Blob;
  recordedFile: File;
  audioUrl: string;
  metadata: RecordingSessionMetadata;
  status: 'READY' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  errorMessage?: string;
  gdriveWebViewLink?: string;
  transcript?: string;
  exchanges?: TranscriptExchange[];
  aiSuggestions?: AISuggestion[];
}

