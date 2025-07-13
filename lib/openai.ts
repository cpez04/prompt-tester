import OpenAI from "openai";

function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  return new OpenAI({ 
    apiKey,
    // Prevent API key from being logged in error messages
    dangerouslyAllowBrowser: false,
  });
}

// Create a singleton instance with proper error handling
let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    try {
      openaiInstance = createOpenAIClient();
    } catch (error) {
      console.error('Failed to initialize OpenAI client');
      throw new Error('OpenAI service unavailable');
    }
  }
  return openaiInstance;
}

// Helper function for safe error handling that doesn't expose API keys
export function handleOpenAIError(error: unknown): string {
  if (error instanceof Error) {
    // Remove any potential API key from error messages
    const sanitizedMessage = error.message.replace(/sk-[a-zA-Z0-9-_]+/g, '[API_KEY_REDACTED]');
    console.error('OpenAI API error:', sanitizedMessage);
    return 'AI service temporarily unavailable';
  }
  console.error('Unknown OpenAI error:', error);
  return 'AI service error';
}