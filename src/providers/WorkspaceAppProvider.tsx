"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { API_BASE_URL } from "@/lib/api";
import { fetchAllBookChunkTexts, invalidateBookChunksCache } from "@/lib/bookChunksApi";
import {
  createChatSession,
  deleteChatSession,
  fetchChatSessions,
  replaceChatSession,
} from "@/lib/chatSessionsApi";
import { ingestStatusFilename } from "@/lib/ingestFilename";
import { mergeAppSettings, readAppSettings, type TtsMode } from "@/lib/appSettings";
import {
  type Book,
  type ChatResponse,
  type ChatSession,
  type IngestStatusPayload,
  type PdfReaderModal,
  type StoredMessage,
  CHAT_STORAGE_KEY,
  readSessionsFromStorage,
  sessionPreviewTitle,
  speechCleanText,
  TERMINAL_INGEST_STATUSES,
  newMessageId,
} from "@/components/workspace/domain";

type SpeechRecognitionResultLike = {
  0: { transcript: string };
  isFinal: boolean;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  }
}

function HighlightedText({
  text,
  start,
  end,
}: {
  text: string;
  start: number;
  end: number;
}) {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  if (e <= s) return <span className="whitespace-pre-wrap break-words">{text}</span>;
  return (
    <span className="whitespace-pre-wrap break-words">
      {text.slice(0, s)}
      <mark className="rounded-sm bg-[var(--accent)]/40 px-0.5 text-[var(--text)]">
        {text.slice(s, e)}
      </mark>
      {text.slice(e)}
    </span>
  );
}

export type BooksLoadStatus = "loading" | "ready" | "error";

export type WorkspaceAppContextValue = {
  books: Book[];
  booksStatus: BooksLoadStatus;
  booksError: string | null;
  selectedBookId: string;
  selectedBook: Book | null;
  loadBooks: () => Promise<Book[] | null>;
  deleteBook: (bookId: string) => Promise<void>;

  file: File | null;
  setFile: (f: File | null) => void;
  isIndexing: boolean;
  indexMessage: string;
  elapsedSeconds: number;
  liveIngestStatus: IngestStatusPayload | null;
  /** Sanitized key for /ingest/status and /ingest/control (matches server `safe_name`). */
  ingestFilename: string;
  /** Human-readable label shown during indexing (custom name or file name). */
  ingestDisplayLabel: string;
  ingestDisplayName: string;
  setIngestDisplayName: (v: string) => void;
  isControllingIngest: boolean;
  embeddingProvider: "openai";
  setEmbeddingProvider: (p: "openai") => void;
  handleIngest: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleIngestControl: (action: "pause" | "resume" | "stop") => Promise<void>;

  chatSessionsHydrated: boolean;
  chatSessions: ChatSession[];
  activeSessionId: string;
  activeSession: ChatSession | null;
  sortedSessions: ChatSession[];
  createNewChatSession: (bookId: string) => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string, e: React.MouseEvent) => void;

  question: string;
  setQuestion: (q: string) => void;
  k: number;
  setK: (k: number) => void;
  chatProvider: "openai";
  setChatProvider: (p: "openai") => void;
  handleAsk: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isAsking: boolean;

  pdfReaderModal: PdfReaderModal | null;
  setPdfReaderModal: (v: PdfReaderModal | null) => void;
  openBookPdf: (bookId: string) => void;
  openSourceInBook: (bookId: string, page: number | undefined, preview?: string) => void;
  sessionBookId: string;

  recognitionSupported: boolean;
  isListening: boolean;
  handleDictation: () => void;
  speakingMessageId: string | null;
  stopSpeaking: () => void;
  speakText: (text: string, messageId?: string) => void;
  ttsMode: TtsMode;
  setTtsMode: (m: TtsMode) => void;
};

const WorkspaceAppContext = createContext<WorkspaceAppContextValue | null>(null);

export function useWorkspaceApp(): WorkspaceAppContextValue {
  const ctx = useContext(WorkspaceAppContext);
  if (!ctx) {
    throw new Error("useWorkspaceApp must be used within WorkspaceAppProvider");
  }
  return ctx;
}

export function WorkspaceAppProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [booksStatus, setBooksStatus] = useState<BooksLoadStatus>("loading");
  const [booksError, setBooksError] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexMessage, setIndexMessage] = useState("");
  const [indexStartedAtMs, setIndexStartedAtMs] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveIngestStatus, setLiveIngestStatus] = useState<IngestStatusPayload | null>(null);
  const [ingestPollFilename, setIngestPollFilename] = useState<string | null>(null);
  const [ingestFilename, setIngestFilename] = useState("");
  const [ingestDisplayLabel, setIngestDisplayLabel] = useState("");
  const [ingestDisplayName, setIngestDisplayName] = useState("");
  const [isControllingIngest, setIsControllingIngest] = useState(false);

  const [question, setQuestion] = useState("");
  const [k, setK] = useState(8);
  const [embeddingProvider, setEmbeddingProviderInner] = useState<"openai">("openai");
  const [chatProvider, setChatProviderInner] = useState<"openai">("openai");
  const [ttsMode, setTtsModeInner] = useState<TtsMode>(() => readAppSettings().ttsMode);
  const [isAsking, setIsAsking] = useState(false);

  const setEmbeddingProvider = useCallback((p: "openai") => {
    setEmbeddingProviderInner(p);
    mergeAppSettings({ embeddingProvider: p });
  }, []);

  const setChatProvider = useCallback((p: "openai") => {
    setChatProviderInner(p);
    mergeAppSettings({ chatProvider: p });
  }, []);

  const setTtsMode = useCallback((m: TtsMode) => {
    setTtsModeInner(m);
    mergeAppSettings({ ttsMode: m });
  }, []);

  const [chatSessionsHydrated, setChatSessionsHydrated] = useState(false);
  const [chatSessionsError, setChatSessionsError] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");

  const [pdfReaderModal, setPdfReaderModal] = useState<PdfReaderModal | null>(null);
  const [pdfAudioLoading, setPdfAudioLoading] = useState(false);
  const [pdfAudioPlaying, setPdfAudioPlaying] = useState(false);
  const [pdfAudioError, setPdfAudioError] = useState("");
  const [pdfAudioChunks, setPdfAudioChunks] = useState<string[]>([]);
  const [pdfAudioChunkIndex, setPdfAudioChunkIndex] = useState(0);
  const [pdfAudioWordStart, setPdfAudioWordStart] = useState(0);
  const [pdfAudioWordEnd, setPdfAudioWordEnd] = useState(0);
  const [pdfStartDialogOpen, setPdfStartDialogOpen] = useState(false);
  const [pdfStartLine, setPdfStartLine] = useState(1);
  const [pdfStartChar, setPdfStartChar] = useState(1);
  const [pdfSelectedStart, setPdfSelectedStart] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const dictationBaseRef = useRef("");
  const pdfAudioTokenRef = useRef(0);
  const pdfPreviewRef = useRef<HTMLParagraphElement | null>(null);
  const serverTtsSpeakTokenRef = useRef(0);
  const serverTtsAudioRef = useRef<HTMLAudioElement | null>(null);
  const serverTtsObjectUrlRef = useRef<string | null>(null);

  const cleanupServerTtsAudio = useCallback(() => {
    if (serverTtsAudioRef.current) {
      try {
        serverTtsAudioRef.current.pause();
      } catch {
        // noop
      }
      serverTtsAudioRef.current.src = "";
      serverTtsAudioRef.current = null;
    }
    if (serverTtsObjectUrlRef.current) {
      URL.revokeObjectURL(serverTtsObjectUrlRef.current);
      serverTtsObjectUrlRef.current = null;
    }
  }, []);

  const selectedBook = useMemo(
    () => books.find((b) => b.book_id === selectedBookId) ?? null,
    [books, selectedBookId],
  );

  const activeSession = useMemo(
    () => chatSessions.find((s) => s.id === activeSessionId) ?? null,
    [chatSessions, activeSessionId],
  );

  const loadBooks = useCallback(async (): Promise<Book[] | null> => {
    setBooksStatus("loading");
    setBooksError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/books`);
      if (!response.ok) {
        setBooksStatus("error");
        setBooksError(`Could not load library (HTTP ${response.status}). Is the API running?`);
        return null;
      }
      const data = await response.json();
      const raw = Array.isArray(data?.books) ? ((data.books as Book[]) ?? []) : [];
      const loaded: Book[] = raw.map((b) => ({
        ...b,
        embedding_provider: "openai" as const,
      }));
      setBooks(loaded);
      setBooksStatus("ready");
      return loaded;
    } catch {
      setBooksStatus("error");
      setBooksError(
        "Could not reach the API. Check that the backend is running and NEXT_PUBLIC_API_BASE_URL matches the server port.",
      );
      return null;
    }
  }, []);

  const deleteBook = useCallback(
    async (bookId: string) => {
      const response = await fetch(`${API_BASE_URL}/books/${encodeURIComponent(bookId)}`, {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => ({}))) as { detail?: unknown };
      if (!response.ok) {
        const detail =
          typeof body.detail === "string"
            ? body.detail
            : `Could not delete book (HTTP ${response.status}).`;
        throw new Error(detail);
      }

      const nextSessions = chatSessions.filter((s) => s.bookId !== bookId);
      const lostActive =
        Boolean(activeSessionId) &&
        chatSessions.some((s) => s.id === activeSessionId && s.bookId === bookId);
      const sorted = [...nextSessions].sort((a, b) => b.updatedAt - a.updatedAt);
      const fallbackSession = sorted[0];

      setChatSessions(nextSessions);
      if (lostActive) {
        setActiveSessionId(fallbackSession?.id ?? "");
        if (fallbackSession) {
          setEmbeddingProvider(fallbackSession.embeddingProvider);
          setChatProvider(fallbackSession.chatProvider);
        }
      }

      const loaded =       await loadBooks();
      invalidateBookChunksCache(bookId);

      setSelectedBookId((prev) => {
        if (prev !== bookId) return prev;
        if (lostActive && fallbackSession) return fallbackSession.bookId;
        return loaded?.[0]?.book_id ?? "";
      });
    },
    [activeSessionId, chatSessions, loadBooks],
  );

  const recognitionSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const stopSpeaking = useCallback(() => {
    serverTtsSpeakTokenRef.current += 1;
    cleanupServerTtsAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
  }, [cleanupServerTtsAudio]);

  const speakText = useCallback(
    (text: string, messageId?: string) => {
      if (typeof window === "undefined") return;
      const payload = speechCleanText(text);
      if (!payload) return;
      serverTtsSpeakTokenRef.current += 1;
      const token = serverTtsSpeakTokenRef.current;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      cleanupServerTtsAudio();
      if (messageId) setSpeakingMessageId(messageId);

      if (ttsMode === "openai") {
        void (async () => {
          try {
            const response = await fetch(`${API_BASE_URL}/tts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: payload }),
            });
            if (!response.ok) {
              const err = (await response.json().catch(() => ({}))) as { detail?: string };
              throw new Error(err?.detail ?? `TTS failed (HTTP ${response.status}).`);
            }
            const blob = await response.blob();
            if (token !== serverTtsSpeakTokenRef.current) return;
            const url = URL.createObjectURL(blob);
            serverTtsObjectUrlRef.current = url;
            const audio = new Audio(url);
            serverTtsAudioRef.current = audio;
            audio.onended = () => {
              cleanupServerTtsAudio();
              setSpeakingMessageId((prev) => (messageId && prev === messageId ? null : prev));
            };
            audio.onerror = () => {
              cleanupServerTtsAudio();
              setSpeakingMessageId((prev) => (messageId && prev === messageId ? null : prev));
            };
            await audio.play();
          } catch {
            if (token === serverTtsSpeakTokenRef.current) {
              cleanupServerTtsAudio();
              setSpeakingMessageId(null);
            }
          }
        })();
        return;
      }

      if (!("speechSynthesis" in window)) return;
      const utter = new SpeechSynthesisUtterance(payload);
      utter.rate = 1;
      utter.pitch = 1;
      utter.onend = () => {
        setSpeakingMessageId((prev) => (messageId && prev === messageId ? null : prev));
      };
      utter.onerror = () => {
        setSpeakingMessageId((prev) => (messageId && prev === messageId ? null : prev));
      };
      window.speechSynthesis.speak(utter);
    },
    [cleanupServerTtsAudio, ttsMode],
  );

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const loadChatSessions = useCallback(async () => {
    setChatSessionsError(null);
    try {
      let sessions = await fetchChatSessions();
      const legacy = readSessionsFromStorage();
      if (sessions.length === 0 && legacy.length > 0) {
        for (const s of legacy) {
          try {
            await createChatSession(s);
          } catch {
            // skip failed legacy rows
          }
        }
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(CHAT_STORAGE_KEY);
        }
        sessions = await fetchChatSessions();
      }
      sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      setChatSessions(sessions);
      return sessions;
    } catch (e) {
      setChatSessionsError(
        e instanceof Error ? e.message : "Could not load chat sessions from the API.",
      );
      setChatSessions([]);
      return [];
    }
  }, []);

  useEffect(() => {
    const prefs = readAppSettings();
    setTtsModeInner(prefs.ttsMode);
    setEmbeddingProviderInner(prefs.embeddingProvider);
    setChatProviderInner(prefs.chatProvider);

    void (async () => {
      const loaded = await loadChatSessions();
      if (loaded.length > 0) {
        setActiveSessionId(loaded[0].id);
        const first = loaded[0];
        setSelectedBookId(first.bookId);
        setEmbeddingProviderInner(first.embeddingProvider);
        setChatProviderInner(first.chatProvider);
      }
      setChatSessionsHydrated(true);
    })();
  }, [loadChatSessions]);

  useEffect(() => {
    if (!pdfReaderModal) return;
    setPdfAudioError("");
    setPdfAudioChunks([]);
    setPdfAudioChunkIndex(0);
    setPdfAudioWordStart(0);
    setPdfAudioWordEnd(0);
    setPdfStartDialogOpen(false);
    setPdfStartLine(1);
    setPdfStartChar(1);
    setPdfSelectedStart(null);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pdfAudioTokenRef.current += 1;
        setPdfAudioPlaying(false);
        setPdfAudioLoading(false);
        cleanupServerTtsAudio();
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
        setPdfReaderModal(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [pdfReaderModal, cleanupServerTtsAudio]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // noop
        }
      }
      cleanupServerTtsAudio();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      pdfAudioTokenRef.current += 1;
    };
  }, [cleanupServerTtsAudio]);

  useEffect(() => {
    if (!isIndexing || indexStartedAtMs === null) return;
    const timer = setInterval(() => {
      setElapsedSeconds((Date.now() - indexStartedAtMs) / 1000);
    }, 250);
    return () => clearInterval(timer);
  }, [isIndexing, indexStartedAtMs]);

  useEffect(() => {
    if (selectedBook?.embedding_provider) {
      setEmbeddingProvider(selectedBook.embedding_provider);
    }
  }, [selectedBook]);

  useEffect(() => {
    if (!ingestPollFilename) return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/ingest/status?filename=${encodeURIComponent(ingestPollFilename)}`,
        );
        if (!response.ok) return;
        const data = (await response.json()) as IngestStatusPayload;
        setLiveIngestStatus(data);
        if (TERMINAL_INGEST_STATUSES.includes(data.status)) {
          setIngestPollFilename(null);
          void loadBooks();
        }
      } catch {
        // ignore transient polling errors
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [ingestPollFilename, loadBooks]);

  const handleIngestControl = async (action: "pause" | "resume" | "stop") => {
    if (!ingestFilename) return;
    setIsControllingIngest(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/ingest/control?filename=${encodeURIComponent(ingestFilename)}&action=${action}`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail ?? `Failed to ${action}.`);
      }
    } catch (error) {
      setIndexMessage(error instanceof Error ? error.message : `Failed to ${action}.`);
    } finally {
      setIsControllingIngest(false);
    }
  };

  const handleIngest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setIndexMessage("Choose a PDF first.");
      return;
    }

    setIsIndexing(true);
    setIndexStartedAtMs(Date.now());
    setElapsedSeconds(0);
    setIndexMessage("");
    setLiveIngestStatus(null);
    const trimmedName = ingestDisplayName.trim();
    const statusKey = ingestStatusFilename(file, trimmedName);
    setIngestFilename(statusKey);
    setIngestPollFilename(statusKey);
    setIngestDisplayLabel(trimmedName || file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (trimmedName) {
        formData.append("display_name", trimmedName);
      }

      const response = await fetch(
        `${API_BASE_URL}/books/ingest?embedding_provider=${embeddingProvider}`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail ?? "Ingestion failed.");
      }
      setIndexMessage(
        data.status === "stopped"
          ? `Indexing stopped. ${data.chunks_indexed ?? 0}/${data.total_chunks_for_run ?? 0} chunks.`
          : `Indexed ${data.filename}: ${data.pages} pages, ${data.total_chunks_for_run} chunks.`,
      );
      setIngestDisplayName("");
      await loadBooks();
    } catch (error) {
      setIndexMessage(error instanceof Error ? error.message : "Ingestion failed.");
    } finally {
      setIsIndexing(false);
      setIngestPollFilename(null);
    }
  };

  const createNewChatSession = useCallback(
    (bookId: string) => {
      if (!bookId) return;
      const book = books.find((b) => b.book_id === bookId);
      const id = newMessageId();
      const session: ChatSession = {
        id,
        bookId,
        bookLabel: book?.filename ?? bookId,
        embeddingProvider,
        chatProvider,
        title: "New chat",
        messages: [],
        updatedAt: Date.now(),
      };
      setChatSessions((prev) => [session, ...prev]);
      setActiveSessionId(id);
      setSelectedBookId(bookId);
      if (book?.embedding_provider) {
        setEmbeddingProvider(book.embedding_provider);
      }
      void createChatSession(session).catch(() => {
        setChatSessionsError("Could not save new chat session.");
      });
    },
    [books, embeddingProvider, chatProvider, setEmbeddingProvider],
  );

  const selectSession = (id: string) => {
    const s = chatSessions.find((x) => x.id === id);
    setActiveSessionId(id);
    if (s) {
      setSelectedBookId(s.bookId);
      setEmbeddingProvider(s.embeddingProvider);
      setChatProvider(s.chatProvider);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeSessionId === id) {
        const sorted = [...next].sort((a, b) => b.updatedAt - a.updatedAt);
        const fallback = sorted[0];
        setActiveSessionId(fallback?.id ?? "");
        if (fallback) {
          setSelectedBookId(fallback.bookId);
          setEmbeddingProvider(fallback.embeddingProvider);
          setChatProvider(fallback.chatProvider);
        }
      }
      return next;
    });
    void deleteChatSession(id).catch(() => {
      setChatSessionsError("Could not delete chat session.");
      void loadChatSessions();
    });
  };

  const openSourceInBook = (bookId: string, page: number | undefined, preview?: string) => {
    if (!bookId || page == null || page < 1) return;
    const snippet =
      (preview ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .slice(0, 8)
        .join(" ") || "";
    const fragment = snippet
      ? `#page=${page}&search=${encodeURIComponent(snippet)}`
      : `#page=${page}`;
    const url = `${API_BASE_URL}/books/${encodeURIComponent(bookId)}/pdf${fragment}`;
    const label =
      books.find((b) => b.book_id === bookId)?.filename ??
      activeSession?.bookLabel ??
      "Book";
    setPdfReaderModal({ url, title: label });
  };

  const openBookPdf = (bookId: string) => {
    if (!bookId) return;
    const url = `${API_BASE_URL}/books/${encodeURIComponent(bookId)}/pdf`;
    const label = books.find((b) => b.book_id === bookId)?.filename ?? "Book";
    setPdfReaderModal({ url, title: label });
  };

  const parseBookIdFromPdfUrl = (url: string): string | null => {
    const m = url.match(/\/books\/([^/]+)\/pdf/);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  };

  const loadBookChunksForAudio = useCallback(
    async (bookId: string, embeddingProvider: string = "openai") =>
      fetchAllBookChunkTexts(bookId, embeddingProvider),
    [],
  );

  const mapLineCharToChunkPosition = (chunks: string[], line: number, char: number) => {
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
  };

  const stopPdfAudio = useCallback(() => {
    pdfAudioTokenRef.current += 1;
    setPdfAudioPlaying(false);
    setPdfAudioLoading(false);
    setPdfAudioChunks([]);
    setPdfAudioChunkIndex(0);
    setPdfAudioWordStart(0);
    setPdfAudioWordEnd(0);
    cleanupServerTtsAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [cleanupServerTtsAudio]);

  const startPdfAudio = useCallback(
    async (opts?: { startChunkIndex?: number; startCharIndex?: number }) => {
      if (!pdfReaderModal || typeof window === "undefined") return;
      if (ttsMode === "browser" && !("speechSynthesis" in window)) return;
      const bookId = parseBookIdFromPdfUrl(pdfReaderModal.url);
      if (!bookId) {
        setPdfAudioError("Could not determine book ID for audio.");
        return;
      }
      const embeddingProvider =
        books.find((b) => b.book_id === bookId)?.embedding_provider ?? "openai";
      stopPdfAudio();
      setPdfAudioError("");
      setPdfAudioLoading(true);
      const token = pdfAudioTokenRef.current + 1;
      pdfAudioTokenRef.current = token;
      try {
        const parts = await loadBookChunksForAudio(bookId, embeddingProvider);
        if (pdfAudioTokenRef.current !== token) return;
        if (parts.length === 0) {
          throw new Error("No readable text found for this book.");
        }
        const startChunkIndex = Math.max(
          0,
          Math.min(opts?.startChunkIndex ?? 0, parts.length - 1),
        );
        const startCharIndex = Math.max(
          0,
          Math.min(opts?.startCharIndex ?? 0, Math.max(0, parts[startChunkIndex].length - 1)),
        );
        setPdfAudioPlaying(true);
        setPdfAudioChunks(parts);
        setPdfAudioChunkIndex(startChunkIndex);
        setPdfAudioWordStart(startCharIndex);
        setPdfAudioWordEnd(Math.min(startCharIndex + 1, parts[startChunkIndex].length));

        if (ttsMode === "openai") {
          let idx = startChunkIndex;
          while (idx < parts.length) {
            if (pdfAudioTokenRef.current !== token) return;
            const startOffset = idx === startChunkIndex ? startCharIndex : 0;
            const chunkText = parts[idx];
            const slice = (startOffset > 0 ? chunkText.slice(startOffset) : chunkText).trim();
            setPdfAudioChunkIndex(idx);
            setPdfAudioWordStart(0);
            setPdfAudioWordEnd(chunkText.length);
            if (!slice) {
              idx += 1;
              continue;
            }
            try {
              const response = await fetch(`${API_BASE_URL}/tts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: slice.slice(0, 8000) }),
              });
              if (!response.ok) {
                const err = (await response.json().catch(() => ({}))) as { detail?: string };
                throw new Error(err?.detail ?? `TTS failed (HTTP ${response.status}).`);
              }
              const blob = await response.blob();
              if (pdfAudioTokenRef.current !== token) return;
              const url = URL.createObjectURL(blob);
              serverTtsObjectUrlRef.current = url;
              const audio = new Audio(url);
              serverTtsAudioRef.current = audio;
              await new Promise<void>((resolve, reject) => {
                audio.onended = () => {
                  cleanupServerTtsAudio();
                  resolve();
                };
                audio.onerror = () => {
                  cleanupServerTtsAudio();
                  reject(new Error("Audio playback error."));
                };
                void audio.play().catch(reject);
              });
            } catch (e) {
              if (pdfAudioTokenRef.current === token) {
                setPdfAudioError(e instanceof Error ? e.message : "Server TTS failed.");
                setPdfAudioPlaying(false);
                setPdfAudioWordStart(0);
                setPdfAudioWordEnd(0);
              }
              return;
            }
            idx += 1;
          }
          if (pdfAudioTokenRef.current === token) {
            setPdfAudioPlaying(false);
            setPdfAudioWordStart(0);
            setPdfAudioWordEnd(0);
          }
          return;
        }

        let idx = startChunkIndex;
        const speakNext = () => {
          if (pdfAudioTokenRef.current !== token) return;
          if (idx >= parts.length) {
            setPdfAudioPlaying(false);
            setPdfAudioWordStart(0);
            setPdfAudioWordEnd(0);
            return;
          }
          const startOffset = idx === startChunkIndex ? startCharIndex : 0;
          setPdfAudioChunkIndex(idx);
          setPdfAudioWordStart(startOffset);
          setPdfAudioWordEnd(Math.min(startOffset + 1, parts[idx].length));
          const chunkText = parts[idx];
          const utter = new SpeechSynthesisUtterance(
            startOffset > 0 ? chunkText.slice(startOffset) : chunkText,
          );
          utter.rate = 1;
          utter.pitch = 1;
          utter.onboundary = (event) => {
            if (pdfAudioTokenRef.current !== token) return;
            const e = event as SpeechSynthesisEvent;
            const start = Math.min(Math.max(0, startOffset + e.charIndex), chunkText.length);
            let end = e.charLength > 0 ? start + e.charLength : start;
            if (end <= start) {
              const rest = chunkText.slice(start);
              const word = rest.match(/^\s*\S+/)?.[0] ?? rest.slice(0, 1);
              end = Math.min(start + (word?.length ?? 1), chunkText.length);
            } else {
              end = Math.min(end, chunkText.length);
            }
            setPdfAudioWordStart(start);
            setPdfAudioWordEnd(end);
          };
          utter.onend = () => {
            if (pdfAudioTokenRef.current !== token) return;
            setPdfAudioWordStart(0);
            setPdfAudioWordEnd(0);
            idx += 1;
            speakNext();
          };
          utter.onerror = (event) => {
            if (pdfAudioTokenRef.current !== token) return;
            const synthError = (event as SpeechSynthesisErrorEvent).error;
            if (synthError === "canceled" || synthError === "interrupted") return;
            setPdfAudioPlaying(false);
            setPdfAudioWordStart(0);
            setPdfAudioWordEnd(0);
            setPdfAudioError("Audio playback stopped due to a speech synthesis error.");
          };
          window.speechSynthesis.speak(utter);
        };
        speakNext();
      } catch (error) {
        if (pdfAudioTokenRef.current === token) {
          setPdfAudioError(error instanceof Error ? error.message : "Could not start audio.");
          setPdfAudioPlaying(false);
        }
      } finally {
        if (pdfAudioTokenRef.current === token) setPdfAudioLoading(false);
      }
    },
    [pdfReaderModal, books, loadBookChunksForAudio, stopPdfAudio, ttsMode, cleanupServerTtsAudio],
  );

  const loadPdfChunksIfNeeded = useCallback(async () => {
    if (!pdfReaderModal) return;
    const bookId = parseBookIdFromPdfUrl(pdfReaderModal.url);
    if (!bookId) return;
    if (pdfAudioChunks.length > 0) return;
    const embeddingProvider =
      books.find((b) => b.book_id === bookId)?.embedding_provider ?? "openai";
    setPdfAudioLoading(true);
    setPdfAudioError("");
    try {
      const chunks = await loadBookChunksForAudio(bookId, embeddingProvider);
      setPdfAudioChunks(chunks);
    } catch (error) {
      setPdfAudioError(
        error instanceof Error ? error.message : "Could not load book text for audio.",
      );
    } finally {
      setPdfAudioLoading(false);
    }
  }, [pdfReaderModal, pdfAudioChunks.length, books, loadBookChunksForAudio]);

  const pdfJoined = pdfAudioChunks.join("\n");
  const pdfLines = pdfJoined ? pdfJoined.split("\n") : [];
  const pdfLineCount = pdfLines.length;
  const clampedPdfLine = Math.max(1, Math.min(pdfStartLine, Math.max(1, pdfLineCount)));
  const pdfLineText = pdfLines[clampedPdfLine - 1] ?? "";
  const pdfLineMaxChar = Math.max(1, pdfLineText.length);

  const handlePdfSelection = () => {
    const container = pdfPreviewRef.current;
    if (!container) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setPdfSelectedStart(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setPdfSelectedStart(null);
      return;
    }
    const pre = range.cloneRange();
    pre.selectNodeContents(container);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    if (!range.toString().trim()) {
      setPdfSelectedStart(null);
      return;
    }
    setPdfSelectedStart(Math.max(0, start));
  };

  const handleAsk = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBookId || !question.trim()) return;

    let sid = activeSessionId;
    let sessionSnapshot = chatSessions.find((s) => s.id === sid) ?? null;

    if (!sid) {
      const book = books.find((b) => b.book_id === selectedBookId);
      sid = newMessageId();
      const session: ChatSession = {
        id: sid,
        bookId: selectedBookId,
        bookLabel: book?.filename ?? selectedBookId,
        embeddingProvider,
        chatProvider,
        title: "New chat",
        messages: [],
        updatedAt: Date.now(),
      };
      setChatSessions((prev) => [session, ...prev]);
      setActiveSessionId(sid);
      sessionSnapshot = session;
      try {
        await createChatSession(session);
      } catch {
        setChatSessionsError("Could not save new chat session.");
      }
    }

    const q = question.trim();
    const userMsg: StoredMessage = {
      id: newMessageId(),
      role: "user",
      content: q,
      createdAt: Date.now(),
    };

    const sessionWithUser: ChatSession | null = sessionSnapshot
      ? {
          ...sessionSnapshot,
          title:
            sessionSnapshot.messages.length === 0 ? sessionPreviewTitle(q) : sessionSnapshot.title,
          messages: [...sessionSnapshot.messages, userMsg],
          updatedAt: Date.now(),
          bookId: selectedBookId,
          bookLabel: selectedBook?.filename ?? sessionSnapshot.bookLabel,
          embeddingProvider,
          chatProvider,
        }
      : null;

    setChatSessions((prev) =>
      prev.map((s) => (s.id === sid && sessionWithUser ? sessionWithUser : s)),
    );
    setQuestion("");
    setIsAsking(true);

    if (sessionWithUser) {
      void replaceChatSession(sessionWithUser).catch(() => {
        setChatSessionsError("Could not save chat session.");
      });
    }

    const historyPayload = (sessionWithUser?.messages ?? []).slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: selectedBookId,
          question: q,
          k,
          embedding_provider: embeddingProvider,
          chat_provider: chatProvider,
          history: historyPayload,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail ?? "Chat failed.");
      }
      const result = data as ChatResponse;
      const assistantMsg: StoredMessage = {
        id: newMessageId(),
        role: "assistant",
        content: result.answer,
        classification: result.classification,
        sources: result.sources,
        createdAt: Date.now(),
      };
      const sessionWithReply: ChatSession | null = sessionWithUser
        ? {
            ...sessionWithUser,
            messages: [...sessionWithUser.messages, assistantMsg],
            updatedAt: Date.now(),
          }
        : null;
      setChatSessions((prev) =>
        prev.map((s) => (s.id === sid && sessionWithReply ? sessionWithReply : s)),
      );
      if (sessionWithReply) {
        void replaceChatSession(sessionWithReply).catch(() => {
          setChatSessionsError("Could not save chat session.");
        });
      }
    } catch (error) {
      const errText = error instanceof Error ? error.message : "Chat failed.";
      const assistantMsg: StoredMessage = {
        id: newMessageId(),
        role: "assistant",
        content: `Error: ${errText}`,
        createdAt: Date.now(),
      };
      const sessionWithError: ChatSession | null = sessionWithUser
        ? {
            ...sessionWithUser,
            messages: [...sessionWithUser.messages, assistantMsg],
            updatedAt: Date.now(),
          }
        : null;
      setChatSessions((prev) =>
        prev.map((s) => (s.id === sid && sessionWithError ? sessionWithError : s)),
      );
      if (sessionWithError) {
        void replaceChatSession(sessionWithError).catch(() => {
          setChatSessionsError("Could not save chat session.");
        });
      }
    } finally {
      setIsAsking(false);
    }
  };

  const handleDictation = () => {
    if (!recognitionSupported || typeof window === "undefined") return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      dictationBaseRef.current = "";
      return;
    }

    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    recognitionRef.current = rec;
    dictationBaseRef.current = question.trim();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const chunk = (event.results[i]?.[0]?.transcript ?? "").trim();
        if (!chunk) continue;
        if (event.results[i]?.isFinal) {
          finalChunk += `${chunk} `;
        } else {
          interimChunk += `${chunk} `;
        }
      }
      if (finalChunk.trim()) {
        dictationBaseRef.current = `${dictationBaseRef.current} ${finalChunk}`
          .replace(/\s+/g, " ")
          .trim();
      }
      const composed = `${dictationBaseRef.current} ${interimChunk}`.replace(/\s+/g, " ").trim();
      setQuestion(composed);
    };
    rec.onerror = () => {
      setIsListening(false);
      dictationBaseRef.current = "";
    };
    rec.onend = () => {
      setIsListening(false);
      dictationBaseRef.current = "";
    };
    setIsListening(true);
    rec.start();
  };

  const sortedSessions = useMemo(
    () => [...chatSessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [chatSessions],
  );

  const sessionBookId = activeSession?.bookId ?? selectedBookId;

  const value: WorkspaceAppContextValue = {
    books,
    booksStatus,
    booksError,
    selectedBookId,
    selectedBook,
    loadBooks,
    deleteBook,
    file,
    setFile,
    isIndexing,
    indexMessage,
    elapsedSeconds,
    liveIngestStatus,
    ingestFilename,
    ingestDisplayLabel,
    ingestDisplayName,
    setIngestDisplayName,
    isControllingIngest,
    embeddingProvider,
    setEmbeddingProvider,
    handleIngest,
    handleIngestControl,
    chatSessionsHydrated,
    chatSessions,
    activeSessionId,
    activeSession,
    sortedSessions,
    createNewChatSession,
    selectSession,
    deleteSession,
    question,
    setQuestion,
    k,
    setK,
    chatProvider,
    setChatProvider,
    handleAsk,
    isAsking,
    pdfReaderModal,
    setPdfReaderModal,
    openBookPdf,
    openSourceInBook,
    sessionBookId,
    recognitionSupported,
    isListening,
    handleDictation,
    speakingMessageId,
    stopSpeaking,
    speakText,
    ttsMode,
    setTtsMode,
  };

  return (
    <WorkspaceAppContext.Provider value={value}>
      {pdfReaderModal ? (
        <div
          className="fixed inset-0 z-[200] flex items-stretch justify-center bg-black/75 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Book PDF"
          onClick={() => {
            stopPdfAudio();
            setPdfReaderModal(null);
          }}
        >
          <div
            className="flex h-[calc(100vh-1rem)] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-input)] shadow-2xl sm:h-[calc(100vh-2rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2">
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-medium text-[var(--text)]"
                  title={pdfReaderModal.title}
                >
                  {pdfReaderModal.title}
                </p>
                {pdfAudioError ? (
                  <p className="mt-1 text-[10px] text-[var(--warning)]">{pdfAudioError}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <p className="hidden text-[10px] text-[var(--muted)] sm:block">
                  Native PDF view (browser engine)
                </p>
                {pdfAudioPlaying ? (
                  <button
                    type="button"
                    onClick={stopPdfAudio}
                    className="rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1 text-xs text-[var(--danger)]"
                  >
                    Stop audio
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={pdfAudioLoading}
                      onClick={() => void startPdfAudio()}
                      className="rounded-md border border-[var(--accent-muted)] bg-[var(--accent-subtle)] px-3 py-1 text-xs text-[var(--accent)] disabled:opacity-50"
                    >
                      {pdfAudioLoading ? "Preparing..." : "Listen in reader"}
                    </button>
                    <button
                      type="button"
                      disabled={pdfAudioLoading}
                      onClick={() => {
                        setPdfSelectedStart(null);
                        setPdfStartDialogOpen(true);
                        void loadPdfChunksIfNeeded();
                      }}
                      className="rounded-md border border-[var(--border)] bg-[var(--chat-thread)] px-3 py-1 text-xs text-[var(--text)] disabled:opacity-50"
                    >
                      Start from...
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    stopPdfAudio();
                    setPdfReaderModal(null);
                  }}
                  className="rounded-md border border-[var(--border)] bg-[var(--chat-thread)] px-3 py-1 text-xs text-[var(--text)] hover:bg-[var(--panel-soft)]"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              key={pdfReaderModal.url}
              title={pdfReaderModal.title}
              src={pdfReaderModal.url}
              className="min-h-0 w-full flex-1 border-0 bg-[var(--surface-muted)]"
              allow="fullscreen"
            />
            {pdfAudioPlaying && pdfAudioChunks.length > 0 ? (
              <div className="shrink-0 border-t border-[var(--border)] bg-[var(--panel-soft)] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
                  Now speaking · chunk {pdfAudioChunkIndex + 1}/{pdfAudioChunks.length}
                </p>
                <p className="mt-1 max-h-20 overflow-y-auto text-xs leading-relaxed text-[var(--text)]">
                  <HighlightedText
                    text={pdfAudioChunks[pdfAudioChunkIndex] ?? ""}
                    start={pdfAudioWordStart}
                    end={pdfAudioWordEnd}
                  />
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {pdfReaderModal && pdfStartDialogOpen ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Start audio from position"
          onClick={() => setPdfStartDialogOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl text-[var(--text)]">Start from position</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">{pdfReaderModal.title}</p>
            {pdfAudioLoading && pdfAudioChunks.length === 0 ? (
              <p className="mt-3 text-xs text-[var(--muted)]">Loading book text…</p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-[var(--muted)]">
                Line
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, pdfLineCount)}
                  value={pdfStartLine}
                  onChange={(e) => setPdfStartLine(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--chat-thread)] px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
              <label className="text-xs text-[var(--muted)]">
                Character
                <input
                  type="number"
                  min={1}
                  max={pdfLineMaxChar}
                  value={pdfStartChar}
                  onChange={(e) => setPdfStartChar(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--chat-thread)] px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] text-[var(--faint)]">
              Lines available: {Math.max(1, pdfLineCount)} · Max char on selected line: {pdfLineMaxChar}
            </p>
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--chat-thread)] px-3 py-2">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--faint)]">
                Line preview (select word/character here)
              </p>
              <p
                ref={pdfPreviewRef}
                onMouseUp={handlePdfSelection}
                onKeyUp={handlePdfSelection}
                className="max-h-24 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-[var(--text)] selection:bg-[var(--accent)]/45"
              >
                {pdfLineText || "(Empty line)"}
              </p>
              {pdfSelectedStart != null ? (
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  Selection starts at character {pdfSelectedStart + 1}
                </p>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPdfStartDialogOpen(false)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pdfAudioChunks.length === 0 || pdfAudioLoading}
                onClick={() => {
                  const pos = mapLineCharToChunkPosition(
                    pdfAudioChunks,
                    clampedPdfLine,
                    Math.max(1, Math.min(pdfStartChar, pdfLineMaxChar)),
                  );
                  setPdfStartDialogOpen(false);
                  void startPdfAudio({ startChunkIndex: pos.chunkIndex, startCharIndex: pos.charIndex });
                }}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--bg)] disabled:opacity-50"
              >
                Start listening
              </button>
              <button
                type="button"
                disabled={pdfSelectedStart == null || pdfAudioChunks.length === 0 || pdfAudioLoading}
                onClick={() => {
                  const pos = mapLineCharToChunkPosition(
                    pdfAudioChunks,
                    clampedPdfLine,
                    (pdfSelectedStart ?? 0) + 1,
                  );
                  setPdfStartDialogOpen(false);
                  void startPdfAudio({ startChunkIndex: pos.chunkIndex, startCharIndex: pos.charIndex });
                }}
                className="rounded-lg border border-[var(--accent-muted)] bg-[var(--accent-subtle)] px-3 py-1.5 text-sm font-medium text-[var(--accent)] disabled:opacity-50"
              >
                Start from selection
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {children}
    </WorkspaceAppContext.Provider>
  );
}
