import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client with the API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Make sure this is set in your .env file
});

export interface GenerateDraftParams {
  originalTweet: string;
  styleAccounts?: string[];
  styleExamples?: string;
  customInstructions?: string;
}

export async function generateDraftReply({
  originalTweet,
  styleAccounts = [],
  styleExamples = '',
  customInstructions = '',
}: GenerateDraftParams): Promise<string> {
  // Check if we're in mock mode for development
  if (process.env.MOCK_ANTHROPIC_API === 'true') {
    console.log('Using mock Anthropic API response');
    // Return mock responses for development
    const mockResponses = [
      "This is a brilliant observation! I've been thinking the same thing lately. Great minds think alike! 💯",
      "Couldn't agree more! This perspective is exactly what more people need to hear about. Thanks for sharing!",
      "Interesting take! I'd add that this connects to broader trends we're seeing in the industry. What do you think?",
      "Love this point! It reminds me of something similar I experienced recently. The parallels are striking.",
      "You've articulated something I've been trying to put into words for ages. This is spot on! 👏"
    ];
    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }

  try {
    console.log('Generating draft reply with Anthropic API');
    
    let systemPrompt = `You are an expert at crafting engaging Twitter replies`;
    
    if (styleAccounts.length > 0) {
      systemPrompt += ` in the style of: ${styleAccounts.join(', ')}`;
    }
    
    if (styleExamples) {
      systemPrompt += `\n\nHere are some example tweets from the account you should mimic the style of:\n\n${styleExamples}`;
    }
    
    systemPrompt += `\n\n${customInstructions}`;

    console.log('System prompt:', systemPrompt);
    console.log('Original tweet:', originalTweet);

    // Add retry logic
    const maxRetries = 3;
    let retryCount = 0;
    let backoffTime = 1000; // Start with 1 second delay
    
    while (retryCount < maxRetries) {
      try {
        const message = await anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 80,
          temperature: 0.7,
          system: systemPrompt + "\n\nKeep your replies concise and under 100 characters when possible.",
          messages: [
            {
              role: 'user',
              content: `Create a short, concise reply to this tweet: "${originalTweet}"\n\nMake sure the reply is engaging, appropriate, and brief (ideally under 100 characters). Return only the reply text.`,
            },
          ],
        });
        
        console.log('Anthropic API response:', JSON.stringify(message.content));

        // Access the text content safely
        if (message.content && message.content.length > 0 && message.content[0].type === 'text') {
          // Access the text content correctly using only the text property
          const textContent = message.content[0].text;
          
          if (textContent) {
            const replyText = textContent.trim();
            console.log('Generated reply:', replyText);
            
            if (!replyText) {
              console.error('Empty reply text received from Anthropic API');
              return "Sorry, I couldn't generate a meaningful reply. Please try again.";
            }
            
            return replyText;
          }
        }
        
        // If we get here, the response format wasn't as expected
        console.error('Unexpected response format from Anthropic API:', message.content);
        return "Sorry, I couldn't generate a reply due to an unexpected API response format.";
      } catch (error: any) {
        // Check if it's an overloaded error
        if (error.status === 529 || (error.error && error.error.type === 'overloaded_error')) {
          retryCount++;
          
          if (retryCount >= maxRetries) {
            console.error(`Failed after ${maxRetries} retries due to Anthropic API overload`);
            throw new Error('Anthropic API is currently overloaded. Please try again later.');
          }
          
          console.log(`Anthropic API overloaded. Retrying in ${backoffTime/1000} seconds... (Attempt ${retryCount}/${maxRetries})`);
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          backoffTime *= 2; // Exponential backoff
        } else {
          // For other errors, throw immediately
          console.error('Anthropic API error:', error);
          throw error;
        }
      }
    }
    
    // This should never be reached due to the throw in the loop
    throw new Error('Unexpected error in retry logic');
  } catch (error: any) {
    console.error('Anthropic API error:', error);
    
    // Provide a more helpful error message
    if (error.status === 401) {
      throw new Error('Anthropic API authentication failed. Please check your API key.');
    }
    
    throw new Error(`Failed to generate draft reply: ${error.message || 'Unknown error'}`);
  }
}
