export interface AIModel {
  id: string;
  name: string;
  provider: string;
  badge?: "Free" | "Fast" | "Reasoning" | "Flagship";
  description: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    badge: "Fast",
    description: "Ultra-fast, state-of-the-art coding and reasoning model.",
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 (Free)",
    provider: "DeepSeek",
    badge: "Free",
    description: "Open reasoning model competing with OpenAI o1.",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash (Free)",
    provider: "Google",
    badge: "Free",
    description: "Next-generation ultra-fast responses with high accuracy.",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B (Free)",
    provider: "Meta",
    badge: "Free",
    description: "High performance open-weights model for deep assistance.",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    badge: "Fast",
    description: "Lightweight, highly capable and cost-effective.",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    badge: "Flagship",
    description: "Top-tier intelligence for software engineering and complex reasoning.",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    badge: "Flagship",
    description: "OpenAI's high-intelligence flagship model.",
  },
];

export const DEFAULT_MODEL_ID = "deepseek/deepseek-chat";
