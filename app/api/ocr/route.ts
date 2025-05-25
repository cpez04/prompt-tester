import { NextResponse } from "next/server";
import { Mistral } from "@mistralai/mistralai";

export async function POST(request: Request) {
  try {
    const { base64Pdf } = await request.json();

    if (!base64Pdf) {
      return NextResponse.json(
        { error: "Base64 PDF data is required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY is not configured");
    }

    const client = new Mistral({ apiKey });

    const ocrResponse = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: `data:application/pdf;base64,${base64Pdf}`,
      },
      includeImageBase64: true,
    });

    return NextResponse.json(ocrResponse);
  } catch (error) {
    console.error("OCR Error:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 },
    );
  }
}
