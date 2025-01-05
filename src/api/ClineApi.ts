import { EventEmitter } from 'events';
import { ApiConfiguration } from '../shared/api.js';
import { buildApiHandler } from './index.js';
import { formatResponse } from '../core/prompts/responses.js';
import { SYSTEM_PROMPT } from '../core/prompts/system.js';

export class ClineApi extends EventEmitter {
  private api: any;
  private taskId: string;

  constructor(apiConfiguration: ApiConfiguration) {
    super();
    this.api = buildApiHandler(apiConfiguration);
    this.taskId = Date.now().toString();
  }

  async executeTask(task: string, images?: string[], customInstructions?: string): Promise<any> {
    try {
      const systemPrompt = await SYSTEM_PROMPT(
        process.cwd(),
        this.api.getModel().info.supportsComputerUse ?? false,
        undefined,
        undefined,
        undefined
      );

      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `<task>\n${task}\n</task>`
            },
            ...(images || []).map(image => ({
              type: 'image',
              source: { type: 'base64', data: image }
            }))
          ]
        }
      ];

      const stream = await this.api.createMessage(systemPrompt, messages);
      let response = '';

      // 進捗状況を報告
      this.emit('progress', {
        type: 'start',
        taskId: this.taskId,
        timestamp: Date.now()
      });

      for await (const chunk of stream) {
        if (chunk.type === 'text') {
          response += chunk.text;
          // 各チャンクを進捗として報告
          this.emit('progress', {
            type: 'chunk',
            taskId: this.taskId,
            content: chunk.text,
            timestamp: Date.now()
          });
        }
      }

      // 完了を報告
      const result = {
        taskId: this.taskId,
        response,
        success: true,
        timestamp: Date.now()
      };

      this.emit('completion', result);
      return result;

    } catch (error) {
      const errorResult = {
        taskId: this.taskId,
        error: error.message,
        success: false,
        timestamp: Date.now()
      };
      
      this.emit('error', errorResult);
      throw error;
    }
  }
}