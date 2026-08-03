import chatManager from './chatManager';

export const startVibeExperiment = () => chatManager.startConversation();

const sanitizeAiContent = content => {
  if (!content) return '';
  // Strip DeepSeek-style <think>...</think> reasoning blocks
  let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // Strip markdown code fences
  const fencedMatch = cleaned.match(/^```[^\n]*\n([\s\S]*?)```$/);
  if (fencedMatch && fencedMatch[1]) {
    cleaned = fencedMatch[1].trim();
  } else {
    cleaned = cleaned.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trim();
  }
  // Extract just the <xml>...</xml> block if present
  const xmlMatch = cleaned.match(/<xml[\s\S]*<\/xml>/i);
  if (xmlMatch) return xmlMatch[0].trim();
  return cleaned;
};

const extractTextFromResponse = result => {
  if (!result) return '';
  const response = result.response || result;
  if (typeof response.text === 'function') {
    return response.text();
  }
  // Fallback for different response formats
  if (typeof response === 'string') {
    return response;
  }
  if (response.content) {
    return response.content;
  }
  return '';
};

export async function generateVibeXml({
  prompt,
  currentXml,
  model
}) {
  const chat = chatManager.getChat({
    model: model
  });

  const message = currentXml
    ? `Here is the current Scratch XML:\n${currentXml}\n\nUser request: ${prompt}`
    : `User request: ${prompt}`;

  const result = await chat.sendMessage({ message });

  const content = extractTextFromResponse(result);
  if (!content) throw new Error('No content returned from AI.');
  return {
    xml: sanitizeAiContent(content),
    requestId: result.requestId || chat.lastRequestId
  };
}
