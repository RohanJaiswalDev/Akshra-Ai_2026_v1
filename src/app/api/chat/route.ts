import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from "@/lib/models";
import { getUserMemories } from "@/lib/db-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 32_000;
const MAX_TOTAL_LENGTH = 100_000;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const ALLOWED_ROLES = new Set(["user", "assistant"]);
const AVAILABLE_MODEL_IDS = new Set(AVAILABLE_MODELS.map(({ id }) => id));

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages?: unknown;
  model?: unknown;
  mode?: "chat" | "voice";
  personality?: "natural" | "professional" | "friendly" | "teacher" | "developer";
};

function jsonError(error: string, status: number, retryable = false) {
  return NextResponse.json(
    { error, retryable },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    return null;
  }

  let totalLength = 0;
  const messages: ChatMessage[] = [];

  for (const message of value) {
    if (
      !message ||
      typeof message !== "object" ||
      !("role" in message) ||
      !("content" in message) ||
      typeof message.role !== "string" ||
      typeof message.content !== "string" ||
      !ALLOWED_ROLES.has(message.role) ||
      !message.content.trim() ||
      message.content.length > MAX_MESSAGE_LENGTH
    ) {
      return null;
    }

    totalLength += message.content.length;
    if (totalLength > MAX_TOTAL_LENGTH) return null;

    messages.push({
      role: message.role as ChatMessage["role"],
      content: message.content,
    });
  }

  return messages;
}

async function getOpenRouterError(response: Response) {
  const fallback = `The AI provider returned an error (${response.status}).`;

  try {
    const payload: unknown = await response.json();
    if (
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object" &&
      "message" in payload.error &&
      typeof payload.error.message === "string"
    ) {
      return payload.error.message;
    }
  } catch {
    // Upstream raw error fallback
  }

  return fallback;
}

function getRetryDelay(response: Response) {
  const retryAfter = Number(response.headers.get("retry-after"));
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? Math.min(retryAfter * 1_000, 2_000)
    : 600;
}

// Phase 3: Automatic Smart Model Routing
function routeModelIntelligently(userPrompt: string, isVoiceMode: boolean): string {
  const text = userPrompt.toLowerCase();

  // Coding intent
  if (
    /\b(code|function|bug|typescript|python|javascript|react|next\.?js|sql|css|html|api|class|algorithm|component|npm|git|debugging|refactor)\b/i.test(
      text
    )
  ) {
    return "anthropic/claude-3.5-sonnet";
  }

  // Complex reasoning & math intent
  if (
    /\b(math|calculate|integral|derivative|equation|theorem|solve|proof|logic|probability|puzzle|chain of thought)\b/i.test(
      text
    )
  ) {
    return "deepseek/deepseek-r1:free";
  }

  // Voice mode default to ultra-fast Gemini Flash
  if (isVoiceMode) {
    return "google/gemini-2.0-flash-exp:free";
  }

  // General fast default
  return "deepseek/deepseek-chat";
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUserFromCookie();
    if (!session?.userId) {
      return jsonError(
        "Authentication required. Please log in or register to chat with Akshra AI.",
        401
      );
    }

    let body: ChatRequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonError("The chat request must contain valid JSON.", 400);
    }

    const messages = parseMessages(body.messages);
    if (!messages) {
      return jsonError("Send between 1 and 50 non-empty chat messages within the size limit.", 400);
    }

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey || apiKey === "your_openrouter_api_key_here") {
      console.error("OpenRouter is not configured.");
      return jsonError("AI service is not configured on this deployment.", 503);
    }

    const configuredDefault = process.env.DEFAULT_OPENROUTER_MODEL?.trim() || DEFAULT_MODEL_ID;
    const requestedModel =
      typeof body.model === "string" && body.model.trim() ? body.model.trim() : configuredDefault;

    if (!AVAILABLE_MODEL_IDS.has(requestedModel)) {
      return jsonError(
        "The selected AI model is unavailable. Choose a model from the list and try again.",
        400
      );
    }

    const isVoiceMode = body.mode === "voice";

    // Auto Model Routing
    let finalModel = requestedModel;
    if (requestedModel === "auto") {
      const latestUserPrompt = messages.filter((m) => m.role === "user").pop()?.content || "";
      finalModel = routeModelIntelligently(latestUserPrompt, isVoiceMode);
    }

    // Phase 4: Fetch user memories
    let memoryGuidance = "";
    try {
      const memories = await getUserMemories(session.userId);
      const active = memories.filter((m) => m.enabled);
      if (active.length > 0) {
        memoryGuidance = `\n\nWhat you remember about the user (incorporate naturally into answers):\n• ${active
          .map((m) => m.content)
          .join("\n• ")}`;
      }
    } catch {
      // Memory failure must never block chat
    }

    // Phase 5: Voice Personality tone adjustment
    const personality = body.personality || "natural";
    let personalityPrompt = "";
    if (personality === "professional") {
      personalityPrompt = " Adopt an articulate, executive, professional demeanor.";
    } else if (personality === "friendly") {
      personalityPrompt = " Adopt a warm, cheerful, enthusiastic, and approachable tone.";
    } else if (personality === "teacher") {
      personalityPrompt = " Adopt an encouraging, patient, clear pedagogical mentor tone.";
    } else if (personality === "developer") {
      personalityPrompt = " Adopt a sharp, concise, pragmatic senior software engineer mindset.";
    }

    const basePrompt = isVoiceMode
      ? `You are Akshra Ai, a real-time conversational voice assistant. You are speaking directly aloud to the user right now.${personalityPrompt} Respond in a warm, lively, concise, and natural human conversational tone. Answer in 1 to 2 short sentences unless the user explicitly asks for more detail. Never use markdown formatting, asterisks, bullet points, numbered lists, emojis, URLs, or code blocks, as your answer is converted straight to human speech.`
      : "You are Akshra Ai, an accurate, helpful AI assistant and senior software engineer. Give clear, well-structured answers. Format code in fenced Markdown blocks with the appropriate language identifier.";

    const systemPrompt = `${basePrompt}${memoryGuidance}`;

    const formattedMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages,
    ];

    let openRouterResponse: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": req.headers.get("origin") || "https://akshra-ai.vercel.app",
          "X-Title": "Akshra Ai",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: finalModel,
          messages: formattedMessages,
          stream: true,
          ...(isVoiceMode ? { max_tokens: 180, temperature: 0.7 } : {}),
        }),
        signal: req.signal,
      });
      openRouterResponse = response;

      if (response.ok || !RETRYABLE_STATUS_CODES.has(response.status) || attempt === 1) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, getRetryDelay(response)));
    }

    if (!openRouterResponse?.ok) {
      const status = openRouterResponse?.status || 502;
      const detail = openRouterResponse
        ? await getOpenRouterError(openRouterResponse)
        : "The AI provider did not return a response.";

      return jsonError(detail, status, RETRYABLE_STATUS_CODES.has(status));
    }

    if (!openRouterResponse.body) {
      return jsonError("The AI provider returned an empty response.", 502, true);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = openRouterResponse.body.getReader();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = "";
        let closed = false;

        const close = () => {
          if (!closed) {
            closed = true;
            controller.close();
          }
        };

        const consumeEvent = (event: string) => {
          const data = event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");

          if (!data) return false;
          if (data === "[DONE]") {
            close();
            return true;
          }

          try {
            const parsed: unknown = JSON.parse(data);
            if (
              parsed &&
              typeof parsed === "object" &&
              "choices" in parsed &&
              Array.isArray(parsed.choices)
            ) {
              const content = parsed.choices[0]?.delta?.content;
              if (typeof content === "string" && content) {
                // If in voice mode and model is DeepSeek R1, filter thinking tags
                if (isVoiceMode && content.includes("<think>")) {
                  // Skip thinking tags in voice mode
                  return false;
                }
                controller.enqueue(encoder.encode(content));
              }
            }
          } catch {
            // Ignore non-content SSE events
          }

          return false;
        };

        try {
          while (!closed) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split(/\r?\n\r?\n/);
            buffer = events.pop() || "";

            for (const event of events) {
              if (consumeEvent(event)) return;
            }
          }

          if (!closed && buffer.trim()) consumeEvent(buffer);
          close();
        } catch (error) {
          if (!closed) controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
      async cancel() {
        await reader.cancel();
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
    console.error("[chat API error]:", error);
    return jsonError("An unexpected error occurred while communicating with the AI service.", 500);
  }
}
