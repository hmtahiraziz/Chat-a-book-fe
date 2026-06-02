import Link from "next/link";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ScrollAnchor } from "@/components/marketing/ScrollAnchor";

const PAIN_POINTS = [
  {
    title: "Ctrl+F only goes so far",
    body: "Long PDFs hide answers across hundreds of pages. Keyword search misses paraphrases and connected ideas.",
  },
  {
    title: "Notes don’t scale",
    body: "Highlighting and margin notes work for one chapter—not for a full textbook or research archive.",
  },
  {
    title: "Generic chat invents details",
    body: "Models without your document will guess. You need replies grounded in what you actually uploaded.",
  },
] as const;

const STEPS = [
  {
    step: "01",
    title: "Upload your PDF",
    body: "Add books to your workspace. The backend chunks and embeds each document for retrieval.",
  },
  {
    step: "02",
    title: "Pick a book to chat",
    body: "Choose from your library. Each conversation stays scoped to the material you selected.",
  },
  {
    step: "03",
    title: "Read answers with sources",
    body: "Responses cite page excerpts so you can verify claims and jump back to the original text.",
  },
] as const;

const FEATURES = [
  {
    title: "Retrieval you can verify",
    body: "Answers are built from relevant passages in your PDF—not from the model’s general knowledge alone.",
  },
  {
    title: "A library that stays organized",
    body: "Track ingestion progress, manage multiple books, and return to any title when you need it.",
  },
  {
    title: "Sessions that remember context",
    body: "Continue threads per book. Pick up where you left off instead of re-explaining the same setup.",
  },
  {
    title: "Optional voice output",
    body: "Listen to replies when you’d rather hear them—useful for review sessions away from the screen.",
  },
] as const;

function ProductPreview() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)]"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
        <span className="ml-2 text-[11px] text-[var(--faint)]">design_patterns.pdf · Chat</span>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-[var(--chat-user)] px-4 py-3 text-[13px] leading-relaxed text-[var(--text)]">
          What problem does the Factory Method pattern solve?
        </div>
        <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-[var(--border)] bg-[var(--chat-assistant)] px-4 py-3">
          <p className="text-[13px] leading-relaxed text-[var(--text)]">
            It decouples object creation from the code that uses those objects, so subclasses can choose
            which concrete type to instantiate without changing client code.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { page: "p. 107", label: "Factory Method — intent" },
              { page: "p. 109", label: "Applicability" },
            ].map((src) => (
              <span
                key={src.page}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-[10px] text-[var(--muted)]"
              >
                <span className="font-medium text-[var(--accent)]">{src.page}</span>
                {src.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <div className="landing-page min-h-screen">
      <MarketingHeader />

      <main>
        {/* Hero */}
        <section className="border-b border-[var(--border)]">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16 lg:py-24">
            <div>
              <p className="mb-4 text-[13px] font-medium tracking-wide text-[var(--accent)]">
                RAG for your own PDFs
              </p>
              <h1 className="font-display text-[2.35rem] leading-[1.12] tracking-tight text-[var(--text)] sm:text-5xl lg:text-[3.25rem]">
                Ask your books.
                <span className="mt-1 block text-[var(--muted)]">Get answers you can cite.</span>
              </h1>
              <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-[var(--muted)]">
                BookChat indexes the documents you upload, retrieves the passages that matter, and
                answers in plain language—with page references so you can check the source.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
                >
                  Try demo — Harry Potter
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] px-5 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-muted)]"
                >
                  Create account
                </Link>
                <ScrollAnchor
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                >
                  How it works
                </ScrollAnchor>
              </div>
              <p className="mt-3 text-[12px] text-[var(--faint)]">
                Demo opens the shared library with no signup — chat against the ingested Harry Potter
                book.
              </p>
              <p className="mt-6 text-[12px] text-[var(--faint)]">
                Bring your own OpenAI key on the server. Vectors in Pinecone, metadata in MongoDB.
              </p>
            </div>
            <div className="relative lg:pt-2">
              <div className="landing-preview-glow pointer-events-none absolute -inset-6 rounded-3xl opacity-60" />
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl tracking-tight text-[var(--text)] sm:text-3xl">
                Reading shouldn’t mean hunting
              </h2>
              <p className="mt-3 text-[16px] leading-relaxed text-[var(--muted)]">
                Dense PDFs are where knowledge lives—and where friction shows up. BookChat is built
                for people who need accurate answers from material they already own.
              </p>
            </div>
            <ul className="mt-10 grid gap-6 sm:grid-cols-3 sm:gap-8">
              {PAIN_POINTS.map((item) => (
                <li
                  key={item.title}
                  className="border-t border-[var(--border)] pt-6 sm:border-t-0 sm:border-l sm:pl-8 sm:pt-0 first:sm:border-l-0 first:sm:pl-0"
                >
                  <h3 className="text-[15px] font-semibold text-[var(--text)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-[4.5rem] border-b border-[var(--border)] sm:scroll-mt-20">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
            <p className="text-[13px] font-medium uppercase tracking-widest text-[var(--faint)]">
              Workflow
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-tight text-[var(--text)] sm:text-3xl">
              From PDF to cited answer in three steps
            </h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {STEPS.map((item) => (
                <li key={item.step}>
                  <span className="font-display text-3xl text-[var(--border-strong)]">{item.step}</span>
                  <h3 className="mt-3 text-[17px] font-semibold text-[var(--text)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-[4.5rem] border-b border-[var(--border)] bg-[var(--surface-raised)] sm:scroll-mt-20">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
            <h2 className="font-display text-2xl tracking-tight text-[var(--text)] sm:text-3xl">
              Built for study, reference, and review
            </h2>
            <p className="mt-3 max-w-xl text-[16px] text-[var(--muted)]">
              The workspace, chat, and settings you use day to day—without turning your library into a
              black box.
            </p>
            <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
              {FEATURES.map((item) => (
                <li
                  key={item.title}
                  className="bg-[var(--surface-card)] p-6 sm:p-8"
                >
                  <h3 className="text-[15px] font-semibold text-[var(--text)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
            <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] px-6 py-8 sm:flex-row sm:items-center sm:px-10 sm:py-10">
              <div>
                <h2 className="font-display text-xl tracking-tight text-[var(--text)] sm:text-2xl">
                  Your books are already on the shelf
                </h2>
                <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
                  Upload a PDF, wait for indexing to finish, and start asking questions in the chat
                  workspace.
                </p>
              </div>
              <Link
                href="/workspace"
                className="shrink-0 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                Open workspace
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-[12px] text-[var(--faint)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>BookChat — chat with documents you upload.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/workspace" className="hover:text-[var(--muted)]">
              Workspace
            </Link>
            <Link href="/chat" className="hover:text-[var(--muted)]">
              Chat
            </Link>
            <Link href="/settings" className="hover:text-[var(--muted)]">
              Settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
