"use client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  // Bypass temporaire: autorise l'acces aux pages sans connexion.
  return <>{children}</>;
}
