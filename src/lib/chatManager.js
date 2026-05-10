import config from '../config';

const PROXY_URL = 'http://localhost:3456/chat';

class ChatManager {
  constructor() {
    this.token = null;
    this.model = null;
    this.systemInstruction = null;
    this.conversationHistory = [];
  }

  getChat({ key, model, systemInstruction } = {}) {
    const resolvedToken = key || config.huggingFaceToken;
    const resolvedModel = model || config.huggingFaceModel;
    const resolvedSystemInstruction = systemInstruction || config.systemInstruction;

    if (!resolvedToken) {
      throw new Error('Missing huggingFaceToken in config.');
    }

    // Reinitialize if token or model changed
    if (this.token === resolvedToken && this.model === resolvedModel) {
      return this;
    }

    this.token = resolvedToken;
    this.model = resolvedModel;
    this.systemInstruction = resolvedSystemInstruction;
    this.conversationHistory = [];

    return this;
  }

  async sendMessage({ message }) {
    // Build messages array with system instruction and conversation history
    const messages = [
      { role: 'system', content: this.systemInstruction }
    ];

    // Add conversation history
    for (const msg of this.conversationHistory) {
      messages.push(msg);
    }

    // Add the new user message
    messages.push({ role: 'user', content: message });

    // Call HuggingFace via local proxy to avoid CORS
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: this.token,
        model: this.model,
        messages: messages,
        max_tokens: 4096,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMsg = typeof errorData.error === 'string'
        ? errorData.error
        : JSON.stringify(errorData.error) || `HTTP error: ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    // Update conversation history
    this.conversationHistory.push({ role: 'user', content: message });
    this.conversationHistory.push({ role: 'assistant', content: assistantMessage });

    return {
      response: {
        text: () => assistantMessage
      }
    };
  }

  reset() {
    this.token = null;
    this.model = null;
    this.systemInstruction = null;
    this.conversationHistory = [];
  }
}

const chatManager = new ChatManager();

export default chatManager;
