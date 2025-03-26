import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StoredData } from '@/types';

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const data: StoredData = JSON.parse(bodyText);

    // Extract assistant info safely
    const assistant = data.assistant || {
      id: '',
      name: 'Unknown',
      model: 'unknown-model',
    };

    const testRun = await prisma.testRun.create({
      data: {
        assistantId: assistant.id,
        assistantName: assistant.name,
        model: assistant.model,
        prompt: data.prompt,
        personaContext: data.persona_situation,

        // Create persona ↔️ thread relationships
        personasOnRun: {
          create: data.threads?.map((thread) => ({
            threadId: thread.threadId,
            persona: {
              connectOrCreate: {
                where: { id: thread.persona.id },
                create: {
                  id: thread.persona.id,
                  name: thread.persona.name,
                  description: thread.persona.description,
                  defaultPrompt: thread.persona.defaultPrompt,
                  initialQuestion: thread.persona.initialQuestion ?? '',
                },
              },
            },
          })) ?? [],
        },

        // Create chatbot thread relationships
        chatbotThreads: {
          create: data.chatbotThreads?.map((ct) => ({
            personaName: ct.persona,
            threadId: ct.threadId,
          })) ?? [],
        },
      },
    });

    console.log('✅ Saved TestRun ID:', testRun.id);
    return NextResponse.json({ success: true, testRunId: testRun.id });
} catch (error: unknown) {
    let message = 'Unknown error';
    if (error instanceof Error) message = error.message;
    else if (typeof error === 'string') message = error;
    else if (error && typeof error === 'object') message = JSON.stringify(error);
  
    console.error('❌ Failed to save test run:', message);
  
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}  