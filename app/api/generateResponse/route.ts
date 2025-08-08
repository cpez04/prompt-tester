import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import { waitForFilesAndVectorStore } from "@/lib/statusPolling";
import OpenAI from "openai";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function cancelActiveRuns(openai: OpenAI, threadId: string) {
  let cancelledAny = false;

  const runsList = await openai.beta.threads.runs.list(threadId, { limit: 2 });

  for (const run of runsList.data) {
    if (
      run.status === "in_progress" ||
      run.status === "queued" ||
      run.status === "requires_action"
    ) {
      console.log(`Canceling active run ${run.id} on thread ${threadId}`);
      await openai.beta.threads.runs.cancel(threadId, run.id);
      cancelledAny = true;
    }
  }

  if (cancelledAny) {
    console.log(`🕰️ Waiting 1.5s after cancelling...`);
    await sleep(1500);

    // 🛑 Now POLL to check if thread is truly clear
    const maxPollAttempts = 5;
    for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
      const newRunsList = await openai.beta.threads.runs.list(threadId, {
        limit: 2,
      });
      const hasActiveRun = newRunsList.data.some(
        (run) =>
          run.status === "in_progress" ||
          run.status === "queued" ||
          run.status === "requires_action",
      );

      if (!hasActiveRun) {
        console.log(
          `✅ No active runs remaining after cancel on thread ${threadId}`,
        );
        return;
      }

      console.log(`Still waiting for thread to clear... attempt ${attempt}/5`);
      await sleep(500); // wait another 500ms before next poll
    }

    console.warn(
      `⚠️ Thread ${threadId} may still have an active run after 5 poll attempts. Proceeding anyway.`,
    );
  } else {
    console.log(`✅ No active runs to cancel on thread ${threadId}.`);
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt} failed:`, error);

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assistantId, threadId, message, files } = body;

    if (!assistantId || !threadId || !message) {
      return NextResponse.json(
        { error: "Missing required fields: assistantId, threadId, or message" },
        { status: 400 },
      );
    }

    const openai = getOpenAIClient();

    // Validate assistant and its vector store access if files are provided
    if (Array.isArray(files) && files.length > 0) {
      try {
        const assistant = await openai.beta.assistants.retrieve(assistantId);
        const vectorStoreIds = assistant.tool_resources?.file_search?.vector_store_ids;
        
        if (!vectorStoreIds?.length) {
          console.error("Assistant has no accessible vector stores for file search");
          return NextResponse.json(
            { error: "Assistant is not configured for file search" },
            { status: 400 }
          );
        }
        
        console.log(`Assistant ${assistantId} has access to vector stores:`, vectorStoreIds);
        
        // Check vector store status
        for (const vsId of vectorStoreIds) {
          try {
            const vectorStore = await openai.beta.vectorStores.retrieve(vsId);
            console.log(`Vector store ${vsId} status: ${vectorStore.status}, files: ${vectorStore.file_counts?.total || 0}`);
            
            if (vectorStore.status !== "completed") {
              console.warn(`Vector store ${vsId} is not ready (status: ${vectorStore.status})`);
            }
          } catch (vsError) {
            console.error(`Error checking vector store ${vsId}:`, vsError);
          }
        }
      } catch (assistantError) {
        console.error("Error validating assistant:", assistantError);
        return NextResponse.json(
          { error: "Failed to validate assistant configuration" },
          { status: 500 }
        );
      }
    }

    // Wait for files and vector store to be ready if files are provided
    if (Array.isArray(files) && files.length > 0) {
      console.log("Waiting for files to be processed before generating response...");
      const fileIds = files.map((file: { id?: string } | string) => (typeof file === 'string' ? file : file.id) || file);
      
      const { filesReady, fileStatuses } = await waitForFilesAndVectorStore(fileIds);
      
      if (!filesReady) {
        const failedFiles = fileStatuses.filter(status => status.status === "error");
        console.error("Some files failed to process:", failedFiles);
        return NextResponse.json(
          { 
            error: "Files are still processing or failed to process. Please wait and try again.",
            failedFiles: failedFiles.map(f => ({ id: f.id, filename: f.filename }))
          },
          { status: 400 }
        );
      }
      
      console.log("All files are ready for processing");
    }

    await cancelActiveRuns(openai, threadId);

    const stream = await withRetry(async () => {
      return await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        stream: true,
        ...(Array.isArray(files) &&
          files.length > 0 && {
            tools: [{ type: "file_search" }],
            tool_choice: "auto",
          }),
        additional_messages: [
          {
            role: "user",
            content: message,
            ...(Array.isArray(files) && files.length > 0 && {
              attachments: files.map(file => ({
                file_id: typeof file === 'string' ? file : file.id,
                tools: [{ type: "file_search" }]
              }))
            })
          },
        ],
      });
    });

    console.log("Chatbot run started on thread:", threadId);

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.event === "thread.message.delta") {
              const textContent =
                event.data.delta.content
                  ?.filter((block) => block.type === "text")
                  .map((block) => block.text?.value)
                  .join(" ") || "";

              if (textContent) {
                controller.enqueue(new TextEncoder().encode(textContent)); // Stream only text
              }
            }

            if (event.event === "thread.run.failed") {
              if (!event.data.last_error) {
                console.error("Run failed without error details", event.data);
                controller.close();
                return;
              }
              console.error("Run failed with error:", event.data.last_error);
              console.error("Full event data:", JSON.stringify(event.data, null, 2));
              
              const errorMessage = `Error: ${event.data.last_error.code} - ${event.data.last_error.message}`;
              controller.enqueue(new TextEncoder().encode(errorMessage));

              controller.close();
              return;
            }

            if (event.event === "thread.message.completed") {
              controller.close(); // Close stream when response is complete
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error generating chatbot response:", error);
    return NextResponse.json(
      { error: "Failed to generate chatbot response" },
      { status: 500 },
    );
  }
}
