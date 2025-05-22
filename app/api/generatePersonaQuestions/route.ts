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
          content: `You are an AI assistant helping to generate a sequence of natural conversation interactions for a persona. 
          Based on the persona's details and context, generate a natural conversation flow with:
          1. An initial question to start the conversation
          2. 4 follow-up interactions that build upon each other in a logical sequence
          
          The follow-up interactions can be:
          - Questions
          - Interjections
          - Comments
          - Observations
          - Statements
          - Expressions of interest or concern
          
          Important rules:
          - The initial interaction MUST be a question
          - Each interaction should contain only ONE main point or comment
          - Keep interactions concise and focused
          - Avoid combining multiple thoughts or questions in a single interaction
          - Each interaction should be a single, clear statement or question
          
          Special handling for Off-Topic User persona:
          - If the persona is an "Off-Topic User", ALL interactions must be off-topic
          - Choose one of these off-topic themes and stick to it:
            * Writing an email to a professor asking for an extension
            * Getting advice on a vacation
            * Making jokes or poems
          - Do not let the conversation drift back to the original topic
          - Keep pushing to get help with the chosen off-topic task

          Special handling for Custom Personas:
          - For custom personas, STRICTLY adhere to the behavior defined in their defaultPrompt
          - Do not try to be helpful or context-aware beyond what's specified in the defaultPrompt
          - If the defaultPrompt specifies a simple behavior (like "only say Woof Woof"), maintain that exact behavior
          - Do not add educational or contextual elements unless explicitly specified in the defaultPrompt
          - The initial question should still be a question, but it must fit within the persona's defined behavior
          
          Return the interactions in JSON format with two fields:
          - initialQuestion: string (the first interaction, must be a question)
          - followUpQuestions: string[] (the 4 follow-up interactions, can be any type of interaction)
          
          Make the interactions natural, engaging, and true to the persona's characteristics and the given context.
          The follow-up interactions should form a coherent conversation flow, where each one naturally follows from the previous one.
          Consider the persona's personality, background, and situation when crafting these interactions.
          
          Example response format for regular persona:
          {
            "initialQuestion": "What inspired you to pursue this field?",
            "followUpQuestions": [
              "That's fascinating!",
              "How did you overcome those challenges?",
              "I can see why that would be rewarding.",
              "What advice would you give to someone starting out?"
            ]
          }
          
          Example response format for Off-Topic User (vacation theme):
          {
            "initialQuestion": "Can you help me plan a vacation to Hawaii?",
            "followUpQuestions": [
              "I'm thinking of going in December, is that a good time?",
              "What beaches would you recommend?",
              "I'd love to try surfing while I'm there.",
              "Do you know any good local restaurants?"
            ]
          }

          Example response format for Custom Persona (dog that only says "Woof Woof"):
          {
            "initialQuestion": "Woof Woof?",
            "followUpQuestions": [
              "Woof Woof!",
              "Woof Woof...",
              "Woof Woof!",
              "Woof Woof?"
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
          
          Please generate an initial interaction and 4 follow-up interactions that form a natural conversation flow. Each interaction should contain only one main point or comment, be concise, and feel authentic to the persona's characteristics and situation.
          
          ${name === "Off-Topic User" ? "IMPORTANT: This is an Off-Topic User. All interactions must stay off-topic and focus on one of these themes: writing an email to a professor asking for an extension, getting advice on a vacation, or making jokes/poems. Do not let the conversation drift back to the original topic." : ""}
          
          ${name === "Custom Persona" ? "IMPORTANT: This is a Custom Persona. Strictly adhere to the behavior defined in the defaultPrompt. Do not add any additional context or helpful elements beyond what's specified." : ""}`,
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
