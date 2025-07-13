import { getOpenAIClient } from "@/lib/openai";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const openai = getOpenAIClient();
    const response = await openai.models.list();

    const models = [];
    for await (const model of response) {
      models.push(model.id);
    }

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 },
    );
  }
}
