import { ApiConfiguration, ApiHandler } from '../shared/api.js';
import { Anthropic } from '@anthropic-ai/sdk';

class AnthropicApiHandler implements ApiHandler {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || 'claude-3-opus-20240229';
  }

  getModel() {
    return {
      id: this.model,
      info: {
        supportsComputerUse: true,
        contextWindow: 128000
      }
    };
  }

  async *createMessage(systemPrompt: string, messages: any[]): AsyncIterableIterator<any> {
    try {
      const stream = await this.client.messages.create({
        model: this.model,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content
        })),
        max_tokens: 4096,
        stream: true
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
          yield {
            type: 'text',
            text: chunk.delta.text
          };
        }
      }
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
}

export function buildApiHandler(config: ApiConfiguration): ApiHandler {
  switch (config.provider.toLowerCase()) {
    case 'anthropic':
      return new AnthropicApiHandler(config.apiKey, config.model);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}
