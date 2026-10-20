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

export type ConsultationMode =
  | 'IN_PERSON'
  | 'TELECONSULTATION'
  | 'REMOTE_TEAMS'
  | 'REMOTE_MEET'
  | 'REMOTE_WHATSAPP'
  | 'FILE_UPLOAD';

export type AudioSourceType = 'MIC' | 'SYSTEM_MIXED' | 'FILE_UPLOAD';

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
  consultationMode?: ConsultationMode;
  audioSource?: AudioSourceType;
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
  differentialDiagnosis?: DifferentialDiagnosisItem[] | any;
  guideline_medicines?: any[];
  guidelineMedicines?: any[];
  medicines?: any[];
  red_flags?: any[];
  redFlags?: any[];
  confidence_metrics?: any;
  confidenceMetrics?: any;
  soap_report?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  soapReport?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  guideline_follow_up_questions?: any[];
  guidelineFollowUpQuestions?: any[];
  follow_up_questions?: any[];
  followUpQuestions?: any[];
  ai_suggestions?: AISuggestion[];
  aiSuggestions?: AISuggestion[];
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
  consultationMode?: ConsultationMode;
  audioSource?: AudioSourceType;
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
  differentialDiagnosis?: any;
  guideline_medicines?: any;
  guidelineMedicines?: any;
  red_flags?: any;
  redFlags?: any;
  confidence_metrics?: any;
  confidenceMetrics?: any;
  follow_up_questions?: any;
  followUpQuestions?: any;
  guideline_follow_up_questions?: any;
  guidelineFollowUpQuestions?: any;
  soap_report?: any;
  soapReport?: any;
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
  consultationMode?: ConsultationMode;
  audioSource?: AudioSourceType;
  status: 'READY' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  errorMessage?: string;
  gdriveWebViewLink?: string;
  transcript?: string;
  exchanges?: TranscriptExchange[];
  aiSuggestions?: AISuggestion[];
}


