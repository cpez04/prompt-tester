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

// Max concurrent OpenAI API calls to avoid rate limits
const MAX_CONCURRENT_REQUESTS = 20;

// Simple semaphore implementation
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

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

    // Process all pages with all selected agents in parallel with rate limiting
    const allComments: AgentComment[] = [];

    // Create semaphore to limit concurrent requests
    const semaphore = new Semaphore(MAX_CONCURRENT_REQUESTS);

    // Create an array of all agent-page combinations to process in parallel
    const processingTasks = [];
    
    for (const agent of selectedAgents as AnalysisAgent[]) {
      for (let pageIndex = 0; pageIndex < muPdfResult.pages.length; pageIndex++) {
        const page = muPdfResult.pages[pageIndex];
        const pageText = extractTextFromMuPDFPage(page);

        if (!pageText.trim()) continue;

        // Create a processing task for this agent-page combination
        processingTasks.push(
          (async () => {
            try {
              // Acquire semaphore permit before making API call
              await semaphore.acquire();
              
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
              if (!analysisResult) {
                semaphore.release();
                return [];
              }

              try {
                const parsedResult = JSON.parse(analysisResult);
                const comments = parsedResult.comments || [];

                // Convert agent comments to our format
                const processedComments = comments.map((comment: { comment?: string; sentence?: string }, commentIndex: number) => {
                  if (comment.comment && comment.sentence) {
                    // Find coordinates for the sentence in the MuPDF data
                    const coordinates = findTextCoordinatesInMuPDFPage(
                      page,
                      comment.sentence,
                    );

                    return {
                      id: `${agent.id}-${pageIndex}-${commentIndex}`,
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
                    };
                  }
                  return null;
                }).filter(Boolean);

                semaphore.release();
                return processedComments;
              } catch (parseError) {
                console.error(`Error parsing ${agent.name} analysis:`, parseError);
                semaphore.release();
                return [];
              }
            } catch (error) {
              console.error(`Error processing ${agent.name} on page ${pageIndex + 1}:`, error);
              semaphore.release();
              return [];
            }
          })()
        );
      }
    }

    // Execute all tasks in parallel
    console.log(`Processing ${processingTasks.length} agent-page combinations in parallel...`);
    const results = await Promise.all(processingTasks);
    
    // Flatten the results into allComments
    results.forEach(comments => {
      if (Array.isArray(comments)) {
        allComments.push(...comments);
      }
    });

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
