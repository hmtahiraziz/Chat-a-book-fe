"use client";

import { ThemeProvider } from "@/providers/ThemeProvider";
import { WorkspaceAppProvider } from "@/providers/WorkspaceAppProvider";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider>
      <WorkspaceAppProvider>{children}</WorkspaceAppProvider>
    </ThemeProvider>
  );
}
