/** Smooth-scroll to a section id, respecting reduced-motion and sticky header offset. */
export function scrollToSection(sectionId: string): void {
  const target = document.getElementById(sectionId);
  if (!target) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({
    behavior: prefersReduced ? "auto" : "smooth",
    block: "start",
  });

  const hash = `#${sectionId}`;
  if (window.location.hash !== hash) {
    window.history.pushState(null, "", hash);
  }
}

export function sectionIdFromHash(href: string): string {
  return href.replace(/^#/, "");
}
