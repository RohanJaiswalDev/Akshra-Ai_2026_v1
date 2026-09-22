import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Max execution duration on Vercel Hobby tier for streaming AI completions

export async function POST(req: Request) {
  try {
    // Strict authentication check: Require genuine logged-in user
    const session = await getCurrentUserFromCookie();
    if (!session || !session.userId) {
      return NextResponse.json(
        {
          error:
            "Authentication required. Please log in or register to chat with Akshra AI.",
        },
        { status: 401 }
      );
    }

    const { messages, model } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        {
          error:
            "OpenRouter API key is not configured. Please add your OPENROUTER_API_KEY to .env.local and restart the server.",
        },
        { status: 401 }
      );
    }

    const selectedModel =
      model ||
      process.env.DEFAULT_OPENROUTER_MODEL ||
      "deepseek/deepseek-chat";

    const systemPrompt = {
      role: "system",
      content:
        "You are Akshra Ai, an ultra-fast, intelligent, and helpful AI assistant and senior software engineer developed in 2026. Provide comprehensive, accurate, structured, and insightful answers. Always format code using standard markdown code blocks with the appropriate language identifier.",
    };

    // Format messages for OpenRouter
    const formattedMessages = [
      systemPrompt,
      ...(Array.isArray(messages)
        ? messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          }))
        : []),
    ];

    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": req.headers.get("origin") || req.headers.get("referer") || "https://akshra-ai.vercel.app",
          "X-Title": "Akshra Ai",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: formattedMessages,
          stream: true,
        }),
      }
    );

    if (!openRouterResponse.ok) {
      let errorMessage = `OpenRouter API error (${openRouterResponse.status})`;
      try {
        const errorData = await openRouterResponse.json();
        if (errorData?.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        const errorText = await openRouterResponse.text();
        if (errorText) errorMessage = errorText;
      }

      return NextResponse.json({ error: errorMessage }, { status: openRouterResponse.status });
    }

    if (!openRouterResponse.body) {
      return NextResponse.json(
        { error: "No response body received from OpenRouter." },
        { status: 500 }
      );
    }

    // Transform OpenRouter SSE stream to plain text stream for the client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = openRouterResponse.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;

              if (trimmed === "data: [DONE]") {
                controller.close();
                return;
              }

              if (trimmed.startsWith("data: ")) {
                try {
                  const jsonStr = trimmed.slice(6);
                  const parsed = JSON.parse(jsonStr);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    controller.enqueue(encoder.encode(delta));
                  }
                } catch {
                  // Ignore JSON parse errors for non-json SSE lines
                }
              }
            }
          }

          if (buffer.trim().startsWith("data: ")) {
            try {
              const jsonStr = buffer.trim().slice(6);
              if (jsonStr !== "[DONE]") {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(encoder.encode(delta));
                }
              }
            } catch {
              // Ignore parse error
            }
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("OpenRouter Chat Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
