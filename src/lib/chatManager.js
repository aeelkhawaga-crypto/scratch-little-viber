import config from '../config';

const PROXY_URL = 'http://localhost:3456/chat';
const KIMI_K3_MODEL = 'moonshotai/Kimi-K3:together';
const DEEPSEEK_V4_FLASH_MODEL = 'deepseek-ai/DeepSeek-V4-Flash-0731:novita';
const REASONING_MODELS = new Set([KIMI_K3_MODEL, DEEPSEEK_V4_FLASH_MODEL]);

class ChatManager {
  constructor() {
    this.token = null;
    this.model = null;
    this.systemInstruction = null;
    this.conversationHistory = [];
    this.lastAssistantMessage = null;
    this.lastRequestId = null;
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
    this.lastAssistantMessage = null;
    this.lastRequestId = null;

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
        temperature: 0.1,
        ...(REASONING_MODELS.has(this.model) ? {reasoning_effort: 'low'} : {})
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
    this.lastRequestId = response.headers.get('X-Request-ID');
    const assistantMessage = data.choices && data.choices[0] && data.choices[0].message;
    const assistantContent = assistantMessage && assistantMessage.content;
    if (!assistantMessage || !assistantContent) {
      throw new Error('The selected model returned no usable XML content. Try another model or simplify the request.');
    }

    // Update conversation history
    this.conversationHistory.push({ role: 'user', content: message });
    this.conversationHistory.push(assistantMessage);
    this.lastAssistantMessage = assistantMessage;

    return {
      requestId: this.lastRequestId,
      response: {
        text: () => assistantContent
      }
    };
  }

  startConversation() {
    this.conversationHistory = [];
    this.lastAssistantMessage = null;
    this.lastRequestId = null;
  }

  reset() {
    this.token = null;
    this.model = null;
    this.systemInstruction = null;
    this.conversationHistory = [];
    this.lastAssistantMessage = null;
    this.lastRequestId = null;
  }
}

const chatManager = new ChatManager();

export default chatManager;
