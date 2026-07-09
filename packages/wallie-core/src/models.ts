export interface WallieAiModel {
  value: string;
  provider: string;
  model: string;
}

export const WALLIE_AI_MODELS: WallieAiModel[] = [
  { value: "gpt-4o", provider: "OpenAI", model: "GPT-4o" },
  { value: "gpt-4o-mini", provider: "OpenAI", model: "GPT-4o Mini" },
  { value: "claude-sonnet-4-6", provider: "Anthropic", model: "Claude Sonnet" },
  { value: "claude-opus-4-6", provider: "Anthropic", model: "Claude Opus" },
  { value: "sonar-pro", provider: "Perplexity", model: "Sonar Pro" },
  {
    value: "sonar-deep-research",
    provider: "Perplexity",
    model: "Sonar Deep Research",
  },
];

export function getWallieModel(value: string): WallieAiModel {
  return WALLIE_AI_MODELS.find((m) => m.value === value) ?? WALLIE_AI_MODELS[0];
}
