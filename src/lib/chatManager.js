import config from '../config';

const PROXY_URL = `${process.env.API_BASE_URL}/chat`;
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
    this.conversationVersion = 0;
  }

  getChat({ model, systemInstruction } = {}) {
    const resolvedModel = model || config.huggingFaceModel;
    const resolvedSystemInstruction = systemInstruction || config.systemInstruction;

    if (this.model === resolvedModel) {
      return this;
    }

    this.model = resolvedModel;
    this.systemInstruction = resolvedSystemInstruction;
    this.conversationHistory = [];
    this.lastAssistantMessage = null;
    this.lastRequestId = null;
    this.conversationVersion++;

    return this;
  }

  async sendMessage({ message }) {
    const conversationVersion = this.conversationVersion;
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
        model: this.model,
        messages: messages,
        max_tokens: 4096,
        temperature: 0.1,
        ...(REASONING_MODELS.has(this.model) ? {reasoning_effort: 'low'} : {})
      })
    });
    const requestId = response.headers.get('X-Request-ID');
    if (conversationVersion === this.conversationVersion) this.lastRequestId = requestId;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errMsg = typeof errorData.error === 'string'
        ? errorData.error
        : JSON.stringify(errorData.error) || `HTTP error: ${response.status}`;
      const error = new Error(errMsg);
      error.requestId = requestId;
      throw error;
    }

    const data = await response.json();
    const assistantMessage = data.choices && data.choices[0] && data.choices[0].message;
    const assistantContent = assistantMessage && assistantMessage.content;
    if (!assistantMessage || !assistantContent) {
      const error = new Error('The selected model returned no usable XML content. You can submit feedback for it.');
      error.requestId = requestId;
      throw error;
    }

    // Update conversation history
    if (conversationVersion === this.conversationVersion) {
      this.conversationHistory.push({ role: 'user', content: message });
      this.conversationHistory.push(assistantMessage);
      this.lastAssistantMessage = assistantMessage;
    }

    return {
      requestId,
      response: {
        text: () => assistantContent
      }
    };
  }

  startConversation() {
    this.conversationVersion++;
    this.conversationHistory = [];
    this.lastAssistantMessage = null;
    this.lastRequestId = null;
  }

  reset() {
    this.conversationVersion++;
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
