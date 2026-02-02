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
