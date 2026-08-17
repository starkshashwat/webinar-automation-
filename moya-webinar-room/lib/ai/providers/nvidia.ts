import { type AIProvider, type GenerateResponseOptions } from './index';
import { type AISettings, type AIResponseResult } from '@/types/ai';
import { applyGuardrails } from '../guardrails';

export class NvidiaProvider implements AIProvider {
  async testConnection(settings: AISettings): Promise<{ success: boolean; message: string }> {
    try {
      const apiKey = settings.api_key || process.env.AI_API_KEY;
      if (!apiKey) return { success: false, message: 'API key is missing.' };

      const baseUrl = settings.api_base_url || 'https://integrate.api.nvidia.com/v1';
      const model = settings.model || 'nvidia/meta/llama-3.1-8b-instruct'; // Fallback model for testing if none configured

      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Reply with OK.' }],
          max_tokens: 10
        })
      });

      if (!response.ok) {
        let errDesc = response.statusText;
        try {
          const errData = await response.json();
          if (errData.error?.message) errDesc = errData.error.message;
        } catch (e) {}
        return { success: false, message: `Connection failed: ${response.status} ${errDesc}` };
      }

      return { success: true, message: 'Connection successful' };
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

    const baseUrl = settings.api_base_url || 'https://integrate.api.nvidia.com/v1';
    const model = settings.model;

    if (!model) {
      return {
        intent: 'GENERAL',
        confidence: 'LOW',
        responseMode: 'no_response',
        response: null,
        status: 'failed',
        errorMessage: 'NVIDIA NIM requires a specific model to be configured.',
      };
    }

    let attempt = 0;
    const maxAttempts = 3;
    let resultJson: any = null;
    let lastError: any = null;

    while (attempt < maxAttempts) {
      try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' }
          })
        });

        if (!response.ok) {
          const errorMsg = `Provider error ${response.status}: ${response.statusText}`;
          const isTransient = response.status === 429 || response.status >= 500;
          
          if (!isTransient && attempt === 0) {
            throw new Error(errorMsg);
          }
          throw new Error(`TRANSIENT:${errorMsg}`);
        }

        const data = await response.json();
        
        if (!data.choices?.[0]?.message?.content) {
          throw new Error('Invalid response structure from provider');
        }

        resultJson = JSON.parse(data.choices[0].message.content);
        break;
      } catch (error: any) {
        lastError = error;
        
        const isTransient = error.message?.startsWith('TRANSIENT:') || 
                            error.message?.includes('fetch failed') || 
                            error.name === 'TypeError';

        if (!isTransient && attempt === 0) {
          break; // Stop immediately for hard errors
        }

        attempt++;
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.warn(`[AI Responder - NVIDIA] Transient error detected. Retrying attempt ${attempt + 1} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!resultJson) {
      console.error('[AI Responder - NVIDIA] Failed to generate response:', lastError);
      return {
        intent: 'GENERAL',
        confidence: 'LOW',
        responseMode: 'no_response',
        response: null,
        status: 'failed',
        errorMessage: lastError?.message || 'Failed to communicate with NVIDIA API after retries',
      };
    }

    try {
      const guardrailResult = applyGuardrails({
        rawResponse: resultJson.response,
        confidence: resultJson.confidence || 'MEDIUM',
        responseMode: resultJson.response_mode || 'public',
        matchedResourceId: resultJson.matched_resource_id,
        activeResources: resources,
        isPrivateIntentDetected: isPrivateByPattern,
      });

      if (guardrailResult.finalResponseMode === 'no_response' || !guardrailResult.finalResponse) {
        return {
          intent: resultJson.intent || 'IRRELEVANT',
          confidence: guardrailResult.confidence,
          responseMode: 'no_response',
          matchedResourceId: resultJson.matched_resource_id,
          response: null,
          status: 'ignored',
        };
      }

      return {
        intent: resultJson.intent || 'QUESTION',
        confidence: guardrailResult.confidence,
        responseMode: guardrailResult.finalResponseMode,
        matchedResourceId: resultJson.matched_resource_id,
        response: guardrailResult.finalResponse,
        status: 'processed',
      };
    } catch (error: any) {
      console.error('[AI Responder - NVIDIA] Guardrail processing error:', error);
      return {
        intent: 'GENERAL',
        confidence: 'LOW',
        responseMode: 'no_response',
        response: null,
        status: 'failed',
        errorMessage: 'Error applying safety guardrails to AI response',
      };
    }
  }
}
