"use client";

import type { MouseEvent, ReactNode } from "react";
import { scrollToSection, sectionIdFromHash } from "@/lib/scrollToSection";

type ScrollAnchorProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export function ScrollAnchor({ href, className, children }: ScrollAnchorProps) {
  const sectionId = sectionIdFromHash(href);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    scrollToSection(sectionId);
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
