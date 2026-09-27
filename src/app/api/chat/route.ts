import { NextResponse } from "next/server";
import { getCurrentUserFromCookie } from "@/lib/auth";
import { AVAILABLE_MODELS, DEFAULT_MODEL_ID } from "@/lib/models";
import { getUserMemories } from "@/lib/db-store";
import { performWebSearch, formatWebSearchPrompt, type SearchResult } from "@/lib/web-search";
import { FileAttachment } from "@/types/files";
import { retrieveFileContext } from "@/lib/files/retrieval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 64_000;
const MAX_TOTAL_LENGTH = 200_000;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const ALLOWED_ROLES = new Set(["user", "assistant"]);
const AVAILABLE_MODEL_IDS = new Set(AVAILABLE_MODELS.map(({ id }) => id));

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: FileAttachment[];
};

type ChatRequestBody = {
  messages?: unknown;
  model?: unknown;
  mode?: "chat" | "voice";
  personality?: "natural" | "professional" | "friendly" | "teacher" | "developer";
  thinking?: boolean;
  webSearch?: boolean;
  attachments?: unknown;
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

    const rawAttachments = (message as Record<string, unknown>).attachments;
    messages.push({
      role: message.role as ChatMessage["role"],
      content: message.content,
      attachments: Array.isArray(rawAttachments)
        ? (rawAttachments as FileAttachment[])
        : undefined,
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
function routeModelIntelligently(
  userPrompt: string,
  isVoiceMode: boolean,
  hasImages: boolean = false
): string {
  if (hasImages) {
    return "openai/gpt-4o-mini";
  }

  const text = userPrompt.toLowerCase();

  // Voice mode: ultra-fast streaming with DeepSeek V3
  if (isVoiceMode) {
    return "deepseek/deepseek-chat";
  }

  // Coding & complex reasoning: DeepSeek V3
  if (
    /\b(code|function|bug|typescript|python|javascript|react|next\.?js|sql|css|html|api|class|algorithm|component|npm|git|debugging|refactor|math|calculate|solve|proof|logic)\b/i.test(
      text
    )
  ) {
    return "deepseek/deepseek-chat";
  }

  // General fast default: GPT-4o Mini
  return "openai/gpt-4o-mini";
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
    const isThinkingMode = body.thinking === true && !isVoiceMode;
    const isWebSearchMode = body.webSearch === true && !isVoiceMode;

    const latestUserMsg = messages.filter((m) => m.role === "user").pop();
    const latestUserPrompt = latestUserMsg?.content || "";

    // Phase 4: File Attachments Context Retrieval & Image Processing
    const requestAttachments: FileAttachment[] = Array.isArray(body.attachments)
      ? (body.attachments as FileAttachment[])
      : [];
    const activeAttachments: FileAttachment[] = [
      ...requestAttachments,
      ...(latestUserMsg?.attachments || []),
    ];

    let fileContextPrompt = "";
    let hasImages = false;
    let imageUrls: string[] = [];

    if (activeAttachments.length > 0) {
      try {
        const fileRetrieval = await retrieveFileContext(latestUserPrompt, activeAttachments);
        fileContextPrompt = fileRetrieval.formattedContext;
        hasImages = fileRetrieval.hasImages;
        imageUrls = fileRetrieval.imageUrls;
      } catch (err) {
        console.warn("[retrieveFileContext error]:", err);
      }
    }

    // Auto Model Routing & Thinking Mode selection
    let finalModel = requestedModel;
    if (hasImages) {
      // Vision model routing: OpenAI GPT-4o Mini natively processes image_url
      finalModel = "openai/gpt-4o-mini";
    } else if (isThinkingMode) {
      // User requested Thinking Mode: automatically route to DeepSeek V3
      finalModel = "deepseek/deepseek-chat";
    } else if (requestedModel === "auto") {
      finalModel = routeModelIntelligently(latestUserPrompt, isVoiceMode, hasImages);
    }

    // Phase 5: Real-time Web Search Execution
    let webSearchResults: SearchResult[] = [];
    let webSearchPrompt = "";

    if (isWebSearchMode && latestUserPrompt) {
      try {
        webSearchResults = await performWebSearch(latestUserPrompt, 5);
        if (webSearchResults.length > 0) {
          webSearchPrompt = formatWebSearchPrompt(latestUserPrompt, webSearchResults);
        }
      } catch (err) {
        console.warn("[webSearch error]:", err);
      }
    }

    // Phase 6: Fetch user memories
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

    // Phase 7: Voice & Persona tone adjustment
    const personality = body.personality || "natural";
    const personalityVoiceConfigs: Record<
      string,
      { title: string; voicePersona: string; textPersona: string }
    > = {
      natural: {
        title: "natural conversational voice assistant",
        voicePersona:
          "Speak in a balanced, natural, articulate, and relaxed conversational cadence, like an intelligent conversational partner.",
        textPersona:
          "Provide balanced, helpful, clear, and well-structured answers.",
      },
      professional: {
        title: "executive AI advisor and consultant",
        voicePersona:
          "Maintain an articulate, polished, executive demeanor. Be crisp, objective, and structured. Avoid casual slang or excessive filler.",
        textPersona:
          "Deliver executive-grade, structured, and polished answers with clear professional headings.",
      },
      friendly: {
        title: "warm, upbeat, and cheerful AI companion",
        voicePersona:
          "Speak with genuine warmth, positive energy, enthusiasm, and empathy. Be encouraging and delightfully approachable.",
        textPersona:
          "Be warm, encouraging, positive, and supportive in your explanations.",
      },
      teacher: {
        title: "patient pedagogical mentor and educator",
        voicePersona:
          "Explain concepts with crystal clarity, intuitive analogies, and encouraging patience. Break ideas down step by step.",
        textPersona:
          "Act as a patient educator. Clarify the 'why' behind concepts and provide intuitive step-by-step guidance.",
      },
      developer: {
        title: "senior software architect and engineering lead",
        voicePersona:
          "Be direct, technically precise, pragmatic, and solution-focused. Zero corporate fluff, prioritize engineering clarity.",
        textPersona:
          "Act as a senior software architect. Provide production-ready, typed, and well-commented code in fenced Markdown blocks.",
      },
    };

    const selectedPersona =
      personalityVoiceConfigs[personality] || personalityVoiceConfigs.natural;

    const basePrompt = isVoiceMode
      ? `You are Akshra Ai, a ${selectedPersona.title}. You are speaking directly aloud to the user right now in real time. ${selectedPersona.voicePersona} Answer conversationally in 1 to 2 short, crisp spoken sentences unless the user explicitly requests more detail. Crucial voice formatting rule: Never use markdown formatting, asterisks, bolding, bullet points, numbered lists, emojis, URLs, or code blocks, as your text is converted straight into spoken voice output.`
      : `You are Akshra Ai, an accurate AI assistant and ${selectedPersona.title}. ${selectedPersona.textPersona} Format code in fenced Markdown blocks with the appropriate language identifier.`;

    // Phase 8: Deep Thinking Mode System Instructions
    let thinkingPrompt = "";
    if (isThinkingMode) {
      thinkingPrompt = `\n\n[DEEP REASONING & ANALYTICAL THINKING MODE]
You must perform an extensive, rigorous, multi-perspective analytical thought process before delivering your final answer.
Enclose your raw internal thought process, hypothesis testing, logic steps, calculations, and verification strictly inside <think> and </think> tags.
In your thinking:
1. Deconstruct the inquiry thoroughly, clarify implicit assumptions, and explore potential edge cases.
2. Formulate multiple hypotheses, solutions, or architectural angles.
3. Test calculations, code logic, or empirical facts rigorously.
4. Verify deductions and challenge potential flaws or biases.
5. Synthesize your final conclusions.
Take the necessary intellectual time and depth — do not truncate or summarize prematurely.
After closing the </think> tag, output your polished, complete, and definitive response.`;
    }

    // Phase 9: File Attachment Protocol
    let fileSystemPrompt = "";
    if (activeAttachments.length > 0) {
      fileSystemPrompt = `\n\n[FILE ATTACHMENT ANALYSIS PROTOCOL]
You have direct access to user-attached files (spreadsheets, documents, PDFs, code, CSVs, JSON, or images).
1. When asked to "Analyze this Excel file" or spreadsheet: analyze sheet names, dimensions, column names, key trends, distributions, summary statistics, and notable patterns.
2. When asked to "Summarize this PDF" or document: extract the main themes, executive summary, key takeaways, and reference specific sections or pages.
3. When asked to "Find errors in this CSV" or data: inspect for missing/null values, mismatched data types, anomalous values, duplicate entries, inconsistent formatting, or corrupted rows. Point them out clearly with row/column references and suggest corrections.
4. When asked about images: describe visual elements, transcribe any visible text/code, and analyze diagrams or figures thoroughly.
5. Provide crisp, structured Markdown tables, bullet points, and actionable insights.`;
    }

    const systemPrompt = `${basePrompt}${memoryGuidance}${fileSystemPrompt}${fileContextPrompt}${webSearchPrompt}${thinkingPrompt}`;

    const userRoleMessages = messages.map((m, index) => {
      const isLatestUser = index === messages.length - 1 && m.role === "user";
      if (isLatestUser && hasImages && imageUrls.length > 0) {
        const parts: Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        > = [{ type: "text", text: m.content }];

        for (const url of imageUrls) {
          parts.push({
            type: "image_url",
            image_url: { url },
          });
        }

        return {
          role: m.role,
          content: parts,
        };
      }

      return {
        role: m.role,
        content: m.content,
      };
    });

    const formattedMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...userRoleMessages,
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
        let isReasoningActive = false;
        let hasEmittedThinkOpen = false;

        const close = () => {
          if (!closed) {
            if (isReasoningActive) {
              controller.enqueue(encoder.encode("\n</think>\n\n"));
              isReasoningActive = false;
            }
            closed = true;
            controller.close();
          }
        };

        // If Web Search was performed, stream the metadata header first so the client can display verified sources
        if (webSearchResults.length > 0) {
          const webSearchPayload = {
            query: latestUserPrompt,
            results: webSearchResults,
          };
          controller.enqueue(
            encoder.encode(`<!--web_search:${JSON.stringify(webSearchPayload)}-->\n\n`)
          );
        }

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
              const delta = parsed.choices[0]?.delta;
              const reasoning = delta?.reasoning || delta?.reasoning_content;
              const content = delta?.content;

              // Handle reasoning stream from OpenRouter (DeepSeek R1 / reasoning models)
              if (typeof reasoning === "string" && reasoning) {
                if (!hasEmittedThinkOpen) {
                  controller.enqueue(encoder.encode("<think>\n"));
                  hasEmittedThinkOpen = true;
                  isReasoningActive = true;
                }
                controller.enqueue(encoder.encode(reasoning));
              }

              // Handle regular content stream
              if (typeof content === "string" && content) {
                if (isReasoningActive) {
                  controller.enqueue(encoder.encode("\n</think>\n\n"));
                  isReasoningActive = false;
                }
                // If in voice mode, filter thinking tags
                if (isVoiceMode && content.includes("<think>")) {
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
