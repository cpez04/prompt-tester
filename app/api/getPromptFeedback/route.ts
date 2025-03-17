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

    const userMessage = `The original system prompt is:\n\n"""${prompt}"""\n\nHere is feedback from different personas:\n${formattedFeedback}\n\nPlease act as a system prompt engineer focused on improving system prompts for educators. Based on the feedback, provide:\n1. An improved version of the system prompt.\n2. Comments and feedback explaining why the changes were made.\n3. Additionally, recommend other strategies beyond prompt tuning that could improve performance.\n\nPlease respond in the following JSON format:\n{\n  \"updated_system_prompt\": \"...\",\n  \"explanation\": \"...\"\n}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a system prompt engineer focused on improving system prompts for educators. You are to provide system prompt feedback and other strategies to educators looking to improve their chatbots for educational purposes. You are to return a JSON object with 2 fields: updated_system_prompt and explanation. The updated_system_prompt field should contain the updated system promp based on the feedback from each of the personas. The explanation field should contain the explanation of the changes made to the system prompt, as well as other strategies that could be used to improve performance besides just prompting. When figuring out how to improve the system prompt, you may wish to consider the following strategies: explicit role definition, behavioral constraints/instructions, formatting guidance, tone and style adjustments, examples or pattern seeding, and instruction repetition or redundancy, domain restriction, self-check/self-reflection cues, and combining strategies!",
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
