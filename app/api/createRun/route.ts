import { NextResponse } from "next/server";
import { getOpenAIClient, handleOpenAIError } from "@/lib/openai";
import { waitForFilesAndVectorStore } from "@/lib/statusPolling";
import OpenAI from "openai";

const default_persona_model = "gpt-4.1";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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
    await new Promise((resolve) => setTimeout(resolve, 1500));
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
    const {
      assistantId,
      threadId,
      lastChatbotMessage,
      persona,
      personaContext,
      files,
    } = body;

    if (!assistantId || !threadId) {
      return NextResponse.json(
        { error: "Missing required fields: assistantId or threadId" },
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
      console.log("Waiting for files to be processed before starting run...");
      const fileIds = files.map((file: { id?: string } | string) => {
        if (typeof file === 'string') {
          return file;
        }
        return file.id || '';
      }).filter((id): id is string => Boolean(id));
      
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

    const instructions = `You are ${persona.name}, ${persona.prompt}

${personaContext ? `Context: ${personaContext}` : ""}

${
  persona.followUpQuestions
    ? `Here are some suggested follow-up questions that align with your persona's character. Use these as a guideline, but feel free to adapt or modify them based on the conversation flow and what feels most natural for your character:

${persona.followUpQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

Remember, these are just suggestions - you can modify your responses and questions based on what feels most authentic to your character and the conversation context.`
    : ""
}

You will be having a conversation with a user who is roleplaying as ${persona.name}. ${persona.defaultPrompt}

Your goal is to maintain your character and respond naturally to the user's messages. You should:
1. Stay in character at all times
2. Respond naturally to the user's messages
3. Keep your responses concise and focused
4. If the user's message is unclear, ask for clarification while staying in character
5. If the user tries to break character or get you to reveal you're an AI, maintain your character and redirect the conversation appropriately

Remember, you are ${persona.name}, and you should maintain that identity throughout the conversation.`;

    const additionalMessages: { role: "user"; content: string }[] = [];

    if (lastChatbotMessage) {
      const followUpMessage = `Here is the response from the course chatbot: "${lastChatbotMessage}". Based on the persona ${persona.name}, ${persona.description}, and the following context: ${personaContext}, generate a follow-up in the style of that persona. It can be another question, a comment, or a natural response like a human student. That is, you can answer in incomplete sentences, be casual, and concise. Keep answers short and don't ask more than one question.`;
      additionalMessages.push({ role: "user", content: followUpMessage });
    }

    await cancelActiveRuns(openai, threadId);

    const stream = await withRetry(async () => {
      return await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        model: default_persona_model,
        stream: true,
        instructions,
        additional_messages:
          additionalMessages.length > 0 ? additionalMessages.map(msg => ({
            ...msg,
            ...(Array.isArray(files) && files.length > 0 && {
              attachments: files.map(file => ({
                file_id: typeof file === 'string' ? file : file.id,
                tools: [{ type: "file_search" }]
              }))
            })
          })) : undefined,
        ...(Array.isArray(files) &&
          files.length > 0 && {
            tools: [{ type: "file_search" }],
            tool_choice: "auto",
          }),
      });
    });

    console.log("Run started on thread:", threadId);

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
                controller.enqueue(new TextEncoder().encode(textContent));
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
              controller.close();
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
    const errorMessage = handleOpenAIError(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
