import { NextResponse } from "next/server";
import OpenAI from "openai";
import { AnalysisAgent, AgentComment } from "@/types";
import {
  processPDFWithMuPDF,
  extractTextFromMuPDFPage,
  findTextCoordinatesInMuPDFPage,
} from "@/lib/mupdf";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { base64Pdf, selectedAgents, fileName } = await request.json();

    if (!base64Pdf || !selectedAgents || selectedAgents.length === 0) {
      return NextResponse.json(
        { error: "Base64 PDF data and selected agents are required" },
        { status: 400 },
      );
    }

    // Process PDF with MuPDF to extract text and coordinates
    const muPdfResult = await processPDFWithMuPDF(base64Pdf);

    // Process each page with each selected agent
    const allComments: AgentComment[] = [];

    for (const agent of selectedAgents as AnalysisAgent[]) {
      for (
        let pageIndex = 0;
        pageIndex < muPdfResult.pages.length;
        pageIndex++
      ) {
        const page = muPdfResult.pages[pageIndex];

        // Extract text content from the page using MuPDF
        const pageText = extractTextFromMuPDFPage(page);

        if (!pageText.trim()) continue;

        // Analyze the page with the current agent
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are the ${agent.name}. ${agent.prompt}

IMPORTANT GUIDELINES:
1. Analyze the syllabus text sentence by sentence
2. For each issue you identify, provide:
   - A specific comment explaining the problem
   - The exact sentence or phrase that has the issue
3. Be constructive and specific in your feedback
4. Focus only on issues relevant to your expertise area
5. Output should be a JSON object with this structure:
{
  "comments": [
    {
      "comment": "Your specific feedback about the issue",
      "sentence": "The exact sentence or phrase with the issue"
    }
  ]
}

Only include issues you actually find. If no issues are found, return an empty comments array.`,
            },
            {
              role: "user",
              content: `Analyze page ${pageIndex + 1} of this syllabus:\n\n${pageText}`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const analysisResult = completion.choices[0]?.message?.content;
        if (!analysisResult) continue;

        try {
          const parsedResult = JSON.parse(analysisResult);
          const comments = parsedResult.comments || [];

          // Convert agent comments to our format
          for (const comment of comments) {
            if (comment.comment && comment.sentence) {
              // Find coordinates for the sentence in the MuPDF data
              const coordinates = findTextCoordinatesInMuPDFPage(
                page,
                comment.sentence,
              );

              allComments.push({
                id: `${agent.id}-${pageIndex}-${allComments.length}`,
                agentId: agent.id,
                agentName: agent.name,
                content: comment.comment,
                coordinates: {
                  x: coordinates?.x || 0,
                  y: coordinates?.y || 0,
                  width: coordinates?.width || 100,
                  height: coordinates?.height || 20,
                  page: pageIndex,
                },
                sentence: comment.sentence,
              });
            }
          }
        } catch (parseError) {
          console.error(`Error parsing ${agent.name} analysis:`, parseError);
        }
      }
    }

    const analysisData = {
      comments: allComments,
      pdfPages: muPdfResult.pageImages,
      fileName: fileName || "syllabus.pdf",
    };

    return NextResponse.json(analysisData);
  } catch (error) {
    console.error("Error in analyzeSyllabusAgents:", error);
    return NextResponse.json(
      { error: "Failed to analyze syllabus with agents" },
      { status: 500 },
    );
  }
}
