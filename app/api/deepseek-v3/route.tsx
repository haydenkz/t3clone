import Together from "together-ai";

interface ChatRequest {
    messageHistory: {
        role: "user" | "assistant";
        content: string;
    }[];
    prompt?: string;
}

export async function POST(request: Request) {
    const together = new Together({
        apiKey: process.env.TOGETHER_KEY || "",
    });

    const { messageHistory, prompt }: ChatRequest = await request.json();
    console.log("Received message history:", messageHistory);

    const stream = await together.chat.completions.create({
        model: "deepseek-ai/deepseek-v3",
        messages: [
            {
                role: "user",
                content:
                    "Context: " +
                    JSON.stringify(messageHistory) +
                    (prompt ? `Prompt: ${prompt}` : ""),
            },
        ],
        stream: true,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || "";
                    if (content) {
                        // Send content immediately for real-time streaming
                        const data = `data: ${JSON.stringify({ content })}\n\n`;
                        controller.enqueue(encoder.encode(data));

                        // Add a small delay to prevent overwhelming the client
                        await new Promise((resolve) => setTimeout(resolve, 10));
                    }
                }
                // Send end signal
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
            } catch (error) {
                console.error("Streaming error:", error);
                controller.error(error);
            }
        },
    });

    return new Response(readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
