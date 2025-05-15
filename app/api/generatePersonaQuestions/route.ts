import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      defaultPrompt,
      playgroundPrompt,
      personaContext,
    } = body;

    if (!name || !description || !defaultPrompt) {
      return NextResponse.json(
        {
          error: "Missing required fields: name, description, or defaultPrompt",
        },
        { status: 400 },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant helping to generate a sequence of conversation questions for a persona. 
          Based on the persona's details and context, generate a natural conversation flow with:
          1. An initial question to start the conversation
          2. 4 follow-up questions that build upon each other in a logical sequence
          
          Return the questions in JSON format with two fields:
          - initialQuestion: string
          - followUpQuestions: string[]
          
          Make the questions natural, engaging, and relevant to the persona's characteristics and the given context.
          The follow-up questions should form a coherent conversation flow, where each question naturally follows from the previous one.
          
          Example response format:
          {
            "initialQuestion": "What inspired you to pursue this field?",
            "followUpQuestions": [
              "How has your perspective changed since you started?",
              "What challenges did you face along the way?",
              "What advice would you give to someone starting out?",
              "What do you find most rewarding about your work?"
            ]
          }`,
        },
        {
          role: "user",
          content: `Persona Details:
          Name: ${name}
          Description: ${description}
          Default Prompt: ${defaultPrompt}
          ${playgroundPrompt ? `\nPlayground Prompt: ${playgroundPrompt}` : ""}
          ${personaContext ? `\nPersona Situation Context: ${personaContext}` : ""}
          
          Please generate an initial question and 4 follow-up questions that form a natural conversation flow, taking into account this persona's characteristics and situation.`,
        },
      ],
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    try {
      const parsed = JSON.parse(content);
      if (
        !parsed.initialQuestion ||
        !Array.isArray(parsed.followUpQuestions) ||
        parsed.followUpQuestions.length !== 4
      ) {
        throw new Error("Invalid response format");
      }
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error generating questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 },
    );
  }
}
