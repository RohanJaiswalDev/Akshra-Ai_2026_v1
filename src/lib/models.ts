export interface AIModel {
  id: string;
  name: string;
  provider: string;
  category: "Fast" | "Reasoning" | "Coding" | "General" | "Auto";
  badge?: "Free" | "Fast" | "Reasoning" | "Flagship" | "Smart";
  description: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "auto",
    name: "Auto (Smart Router)",
    provider: "Akshra AI",
    category: "Auto",
    badge: "Smart",
    description: "Automatically selects the best model for coding, math, or fast chat.",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    category: "Fast",
    badge: "Fast",
    description: "Ultra-fast, state-of-the-art coding and everyday reasoning.",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash (Free)",
    provider: "Google",
    category: "Fast",
    badge: "Free",
    description: "Next-generation ultra-fast responses with high accuracy.",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    category: "Fast",
    badge: "Fast",
    description: "Lightweight, highly capable and cost-effective daily driver.",
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 (Free)",
    provider: "DeepSeek",
    category: "Reasoning",
    badge: "Reasoning",
    description: "Deep reasoning model for math, algorithms, and logic puzzles.",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    category: "Coding",
    badge: "Flagship",
    description: "World-class coding, architecture design, and complex debugging.",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    category: "General",
    badge: "Flagship",
    description: "Balanced, high-intelligence assistant for general knowledge and writing.",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B (Free)",
    provider: "Meta",
    category: "General",
    badge: "Free",
    description: "Versatile open-weights model for deep instruction following.",
  },
];

export const DEFAULT_MODEL_ID = "auto";
