import { GoogleGenerativeAI } from '@google/generative-ai';
import { type AIProvider, type GenerateResponseOptions } from './index';
import { type AISettings, type AIResponseResult } from '@/types/ai';
import { applyGuardrails } from '../guardrails';

export class GoogleProvider implements AIProvider {
  async testConnection(settings: AISettings): Promise<{ success: boolean; message: string }> {
    try {
      const apiKey = settings.api_key || process.env.AI_API_KEY;
      if (!apiKey) return { success: false, message: 'API key is missing.' };

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: settings.model || 'gemini-1.5-flash' });
      
      const result = await model.generateContent("Reply with OK.");
      if (result.response.text()) {
        return { success: true, message: 'Connection successful' };
      }
      return { success: false, message: 'Empty response from model' };
    } catch (err: any) {
      return { success: false, message: `Connection failed: ${err.message || 'Unknown error'}` };
    }
  }

  async generateResponse(options: GenerateResponseOptions): Promise<AIResponseResult> {
    const { settings, systemInstruction, userPrompt, isPrivateByPattern, resources } = options;
    const apiKey = settings.api_key || process.env.AI_API_KEY;
    
    if (!apiKey) {
      return {
        intent: 'GENERAL',
        confidence: 'LOW',
        responseMode: 'no_response',
        response: null,
        status: 'failed',
        errorMessage: 'AI API Key is missing in settings and environment.',
      };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const selectedModel = (settings.model && settings.model !== 'gemini-2.5-flash') 
        ? settings.model 
        : (process.env.AI_MODEL || 'gemini-flash-latest');

      let attempt = 0;
      const maxAttempts = 3;
      let result: any = null;
      let lastError: any = null;

      while (attempt < maxAttempts) {
        try {
          const modelToUse = (attempt === maxAttempts - 1) ? 'gemini-1.5-flash' : selectedModel;
          const model = genAI.getGenerativeModel({
            model: modelToUse,
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });

          result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction,
          });
          
          break; // Success
        } catch (error: any) {
          lastError = error;
          
          const errorMsg = error?.message?.toLowerCase() || '';
          const isTransient = 
            error?.status === 503 || 
            error?.status === 429 ||
            errorMsg.includes('503') || 
            errorMsg.includes('service unavailable') || 
            errorMsg.includes('overload') || 
            errorMsg.includes('high demand') ||
            errorMsg.includes('rate limit') ||
            errorMsg.includes('429');

          if (!isTransient && attempt === 0) {
            throw error;
          }

          attempt++;
          if (attempt < maxAttempts) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.warn(`[AI Responder] Transient error detected. Retrying attempt ${attempt + 1} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!result) {
        throw lastError;
      }

      const text = result.response.text();
      const parsed = JSON.parse(text);

      const guardrailResult = applyGuardrails({
        rawResponse: parsed.response,
        confidence: parsed.confidence || 'MEDIUM',
        responseMode: parsed.response_mode || 'public',
        matchedResourceId: parsed.matched_resource_id,
        activeResources: resources,
        isPrivateIntentDetected: isPrivateByPattern,
        webinar: options.webinar,
      });

      if (guardrailResult.finalResponseMode === 'no_response' || !guardrailResult.finalResponse) {
        return {
          intent: parsed.intent || 'IRRELEVANT',
          confidence: guardrailResult.confidence,
          responseMode: 'no_response',
          matchedResourceId: parsed.matched_resource_id,
          response: null,
          status: 'ignored',
        };
      }

      return {
        intent: parsed.intent || 'QUESTION',
        confidence: guardrailResult.confidence,
        responseMode: guardrailResult.finalResponseMode,
        matchedResourceId: parsed.matched_resource_id,
        response: guardrailResult.finalResponse,
        status: 'processed',
      };

    } catch (error: any) {
      console.error('[AI Responder - Google] Error:', error);
      return {
        intent: 'GENERAL',
        confidence: 'LOW',
        responseMode: 'no_response',
        response: null,
        status: 'failed',
        errorMessage: error?.message || 'Unknown LLM generation error',
      };
    }
  }
}
