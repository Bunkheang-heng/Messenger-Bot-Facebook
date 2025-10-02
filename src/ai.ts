import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing required env var: OPENAI_API_KEY');
    }
    openaiClient = new OpenAI({ apiKey, timeout: 10000, maxRetries: 2 });
  }
  return openaiClient;
}

function clampInput(input: string, maxChars = 800): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars) + '…';
}

export async function generateAiReply(userMessageText: string): Promise<string> {
  const systemPrompt =
    'You are a friendly, concise AI assistant chatting on Facebook Messenger. Answer helpfully and briefly.';

  const safeUser = clampInput(userMessageText);

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 300,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: safeUser }
    ]
  });

  const content = completion.choices?.[0]?.message?.content?.trim();
  // Clamp output as well to prevent excessive message size
  const response = content && content.length > 0
    ? content
    : "I'm here and ready to help! Could you rephrase your question?";
  return clampInput(response, 800);
}


