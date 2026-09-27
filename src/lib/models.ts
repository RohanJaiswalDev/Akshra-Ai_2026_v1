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
    name: "Auto Smart",
    provider: "Akshra AI",
    category: "Auto",
    badge: "Smart",
    description: "Automatically routes prompts to DeepSeek V3 or GPT-4o Mini based on intent.",
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    category: "Fast",
    badge: "Flagship",
    description: "Ultra-fast, state-of-the-art coding, reasoning, and real-time conversation.",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    category: "Reasoning",
    badge: "Reasoning",
    description: "Deep thinking model for complex math, architecture, and multi-step reasoning.",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    category: "Fast",
    badge: "Fast",
    description: "Lightweight, highly capable and cost-effective daily assistant.",
  },
];

export const DEFAULT_MODEL_ID = "auto";
