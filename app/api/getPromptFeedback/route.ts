import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, feedback } = body;

    if (!prompt || !feedback) {
      return NextResponse.json(
        { error: "Missing prompt or feedback." },
        { status: 400 },
      );
    }

    // Construct the user message
    const formattedFeedback = Object.entries(feedback)
      .map(([persona, fb]) => `- ${persona}: ${fb}`)
      .join("\n");

    const userMessage = `The original system prompt is:\n\n"""${prompt}"""\n\nHere is feedback from different personas:\n${formattedFeedback}\n\nPlease act as a system prompt engineer focused on improving system prompts for educators. Based on the feedback, provide:\n1. An improved version of the system prompt.\n2. Comments and feedback explaining why the changes were made. Do not change the original system prompt beyond specific changes that will address the feedback from different personas. If there is no feedback, just return the original system prompt. \n\nPlease respond in the following JSON format:\n{\n  \"updated_system_prompt\": \"...\",\n  \"explanation\": \"...\"\n}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content:
            "You are a system prompt engineer focused on improving system prompts for educators. You are to provide system prompt feedback and other strategies to educators looking to improve their chatbots for educational purposes. You are to return a JSON object with 2 fields: updated_system_prompt and explanation. The updated_system_prompt field should contain the updated system promp based on the feedback from each of the personas. Do not change the original system prompt beyond specific changes that will address the feedback from different personas. The explanation field should contain the explanation/justification of the changes made to the system prompt.",
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      response_format: {
        type: "json_object",
      },
    });

    const content = completion.choices[0].message.content;
    const parsed = content ? JSON.parse(content) : null;

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Error in getPromptFeedback route:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
