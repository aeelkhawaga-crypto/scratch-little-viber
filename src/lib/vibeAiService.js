import chatManager from './chatManager';

const sanitizeAiContent = content => {
  if (!content) return '';
  let cleaned = content.trim();
  const fencedMatch = cleaned.match(/^```[^\n]*\n([\s\S]*?)```$/);
  if (fencedMatch && fencedMatch[1]) {
    cleaned = fencedMatch[1].trim();
  } else {
    cleaned = cleaned
      .replace(/^```[^\n]*\n?/, '')
      .replace(/```$/, '')
      .trim();
  }
  return cleaned;
};

const extractTextFromResponse = result => {
  if (!result) return '';
  const response = result.response || result;
  if (typeof response.text === 'function') {
    return response.text();
  }
  if (Array.isArray(response.candidates)) {
    for (const candidate of response.candidates) {
      const parts = candidate?.content?.parts;
      if (Array.isArray(parts)) {
        const textPart = parts.find(part => part?.text);
        if (textPart?.text) return textPart.text;
      }
      if (candidate?.content?.text) return candidate.content.text;
      if (candidate?.text) return candidate.text;
    }
  }
  return '';
};

export async function generateVibeXml({
  prompt,
  currentXml
}) {
  const chat = chatManager.getChat();

  const userPayload = {
    prompt: currentXml,
    request: prompt
  };

  const result = await chat.sendMessage({
    message: JSON.stringify(userPayload)
  });

  const content = extractTextFromResponse(result);
  if (!content) throw new Error('No content returned from AI.');
  return sanitizeAiContent(content);
}
