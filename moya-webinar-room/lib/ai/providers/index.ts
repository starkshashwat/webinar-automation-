import { type AISettings, type AIResponseResult } from '@/types/ai';
import { type ChatMessage } from '@/types/chat';

export interface GenerateResponseOptions {
  webinar: any;
  settings: AISettings;
  systemInstruction: string;
  userPrompt: string;
  isPrivateByPattern: boolean;
  resources: any[];
}

export interface AIProvider {
  generateResponse(options: GenerateResponseOptions): Promise<AIResponseResult>;
  testConnection(settings: AISettings): Promise<{ success: boolean; message: string }>;
}

import { NvidiaProvider } from './nvidia';

export function getAIProvider(settings: AISettings): AIProvider {
  // Nvidia NIM / OpenAI-compatible provider
  return new NvidiaProvider();
}
