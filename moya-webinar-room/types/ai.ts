export type Intent = 
  | 'GENUINE_QUESTION'
  | 'PROBLEM'
  | 'RESOURCE_REQUEST'
  | 'ENGAGEMENT'
  | 'REACTION'
  | 'CHANNEL_SHARE'
  | 'CASUAL'
  | 'UNCLEAR'
  | 'IRRELEVANT'
  | 'QUESTION' // Legacy/fallback
  | 'GENERAL';

export type AIConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type AIResponseMode = 'public' | 'private' | 'no_response';
export type AIInteractionStatus = 'processed' | 'failed' | 'ignored';

export interface AISettings {
  id: string;
  ai_name: string;
  provider: string;
  api_base_url?: string | null;
  api_key?: string | null;
  model: string;
  system_instructions: string;
  is_enabled_globally: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AIKnowledge {
  id: string;
  webinar_id?: string | null;
  title: string;
  content: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AIResource {
  id: string;
  webinar_id?: string | null;
  name: string;
  description?: string | null;
  url: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AIInteraction {
  id: string;
  webinar_id?: string | null;
  session_id?: string | null;
  attendee_id?: string | null;
  chat_message_id?: string | null;
  attendee_name?: string | null;
  attendee_message?: string | null;
  intent?: string | null;
  response_mode?: AIResponseMode | null;
  response?: string | null;
  confidence?: AIConfidence | null;
  status: AIInteractionStatus;
  error_message?: string | null;
  created_at: string;
}

export interface AIClassificationResult {
  shouldIgnore: boolean;
  intent: Intent;
  confidence: AIConfidence;
  responseMode: AIResponseMode;
  matchedResourceId?: string | null;
  reason?: string;
}

export interface AIResponseResult {
  intent: Intent;
  confidence: AIConfidence;
  responseMode: AIResponseMode;
  matchedResourceId?: string | null;
  response: string | null;
  status: AIInteractionStatus;
  errorMessage?: string | null;
}

// Backward compatibility
export interface KnowledgeBaseEntry {
  id: string;
  webinar_id: string;
  question: string;
  answer: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
