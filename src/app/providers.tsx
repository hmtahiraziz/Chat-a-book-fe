"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { WorkspaceAppProvider } from "@/providers/WorkspaceAppProvider";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGuard>
          <WorkspaceAppProvider>{children}</WorkspaceAppProvider>
        </AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}
