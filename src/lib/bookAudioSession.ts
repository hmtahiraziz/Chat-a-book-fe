export type AudioSessionSource = "library" | "pdf" | "chat";

export type AudioSessionStatus = "idle" | "loading" | "playing" | "paused";

export type BookAudioSession = {
  source: AudioSessionSource;
  bookId?: string;
  title: string;
  chunks: string[];
  chunkIndex: number;
  charOffset: number;
  wordStart: number;
  wordEnd: number;
  status: AudioSessionStatus;
  error?: string;
  /** Set while loading chunks for a specific book (library). */
  loadingBookId?: string;
  /** Chat message id when source is chat. */
  chatMessageId?: string;
};

export const AUDIO_PLAYER_POSITION_KEY = "bookchat-audio-player-position";
export const AUDIO_PLAYER_SPEED_KEY = "bookchat-audio-playback-speed";

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5] as const;

export function createIdleAudioSession(): BookAudioSession {
  return {
    source: "library",
    title: "",
    chunks: [],
    chunkIndex: 0,
    charOffset: 0,
    wordStart: 0,
    wordEnd: 0,
    status: "idle",
  };
}

export function mapLineCharToChunkPosition(chunks: string[], line: number, char: number) {
  const joined = chunks.join("\n");
  if (!joined) return { chunkIndex: 0, charIndex: 0 };
  const lineStarts = [0];
  for (let i = 0; i < joined.length; i += 1) {
    if (joined[i] === "\n") lineStarts.push(i + 1);
  }
  const clampedLine = Math.max(1, Math.min(line, lineStarts.length));
  const lineStart = lineStarts[clampedLine - 1];
  const lineEndExclusive =
    clampedLine < lineStarts.length ? lineStarts[clampedLine] - 1 : joined.length;
  const clampedChar = Math.max(1, char);
  const globalIndex = Math.min(
    Math.max(lineStart + clampedChar - 1, lineStart),
    Math.max(lineStart, lineEndExclusive),
  );
  let cursor = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    const len = chunks[i].length;
    if (globalIndex <= cursor + len - 1) return { chunkIndex: i, charIndex: globalIndex - cursor };
    cursor += len;
    if (i < chunks.length - 1) {
      if (globalIndex === cursor) return { chunkIndex: i + 1, charIndex: 0 };
      cursor += 1;
    }
  }
  return { chunkIndex: chunks.length - 1, charIndex: 0 };
}

export function readPlaybackSpeed(): number {
  if (typeof window === "undefined") return 1;
  const raw = window.localStorage.getItem(AUDIO_PLAYER_SPEED_KEY);
  const n = raw ? Number(raw) : 1;
  return PLAYBACK_SPEEDS.includes(n as (typeof PLAYBACK_SPEEDS)[number]) ? n : 1;
}

export function writePlaybackSpeed(speed: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_PLAYER_SPEED_KEY, String(speed));
}

export type AudioPlayerPosition = { x: number; y: number };

export function readAudioPlayerPosition(): AudioPlayerPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUDIO_PLAYER_POSITION_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof v.x === "number" && typeof v.y === "number") return { x: v.x, y: v.y };
  } catch {
    // ignore
  }
  return null;
}

export function writeAudioPlayerPosition(pos: AudioPlayerPosition): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_PLAYER_POSITION_KEY, JSON.stringify(pos));
}
