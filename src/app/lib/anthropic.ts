import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

type GenerateDraftParams = {
  originalTweet: string;
  styleAccounts?: string[]; // Twitter usernames to mimic
  customInstructions?: string;
};

export async function generateDraftReply({
  originalTweet,
  styleAccounts = [],
  customInstructions = '',
}: GenerateDraftParams): Promise<string> {
  const systemPrompt = `You are an expert at crafting engaging Twitter replies${
    styleAccounts.length > 0
      ? ` in the style of: ${styleAccounts.join(', ')}`
      : ''
  }. ${customInstructions}`;

  const message = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 150,
    temperature: 0.7,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Create a reply to this tweet: "${originalTweet}"\n\nMake sure the reply is engaging, appropriate, and within Twitter's character limit. Return only the reply text.`,
      },
    ],
  });

  // Access the text content safely
  if (message.content[0].type === 'text') {
    return message.content[0].value;
  }
  throw new Error('Unexpected response format from Anthropic API');
}
