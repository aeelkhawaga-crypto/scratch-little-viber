import { GoogleGenAI } from '@google/genai';
import config from '../config';

class ChatManager {
  constructor() {
    this.chat = null;
    this.key = null;
    this.model = null;
  }

  getChat({ key, model, systemInstruction } = {}) {
    const resolvedKey = key || config.geminiApiKey;
    const resolvedModel = model || config.geminiModel;
    const resolvedSystemInstruction = systemInstruction || config.systemInstruction;

    if (!resolvedKey) {
      throw new Error('Missing geminiApiKey in config.');
    }

    if (this.chat && this.key === resolvedKey && this.model === resolvedModel) {
      return this.chat;
    }

    const client = new GoogleGenAI({ apiKey: resolvedKey });
    this.chat = client.chats.create({
      model: resolvedModel,
      config: {
        systemInstruction: resolvedSystemInstruction
      }
    });
    this.key = resolvedKey;
    this.model = resolvedModel;
    return this.chat;
  }

  reset() {
    this.chat = null;
    this.key = null;
    this.model = null;
  }
}

const chatManager = new ChatManager();

export default chatManager;
