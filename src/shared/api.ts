export interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model?: string;
}

export interface ApiModel {
  id: string;
  info: {
    supportsComputerUse?: boolean;
    contextWindow?: number;
  };
}

export interface ApiHandler {
  getModel(): ApiModel;
  createMessage(systemPrompt: string, messages: any[]): AsyncIterableIterator<any>;
}
