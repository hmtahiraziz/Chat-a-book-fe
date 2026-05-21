export type ProviderChoice = "openai";
export type TtsMode = "browser" | "openai";

const STORAGE_KEY = "bookchat-app-settings";

export type AppSettings = {
  embeddingProvider: ProviderChoice;
  chatProvider: ProviderChoice;
  ttsMode: TtsMode;
};

const DEFAULTS: AppSettings = {
  embeddingProvider: "openai",
  chatProvider: "openai",
  ttsMode: "browser",
};

function safeParse(raw: string | null): Partial<AppSettings> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object") return null;
    return v as Partial<AppSettings>;
  } catch {
    return null;
  }
}

export function readAppSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULTS };
  const partial = safeParse(window.localStorage.getItem(STORAGE_KEY));
  if (!partial) return { ...DEFAULTS };
  const tts =
    partial.ttsMode === "openai" || partial.ttsMode === "browser"
      ? partial.ttsMode
      : partial.ttsMode === "gemini"
        ? "openai"
        : DEFAULTS.ttsMode;
  return {
    embeddingProvider: "openai",
    chatProvider: "openai",
    ttsMode: tts,
  };
}

export function mergeAppSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...readAppSettings(), ...partial };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}
