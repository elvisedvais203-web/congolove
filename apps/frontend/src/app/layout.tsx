import type { Metadata } from "next";
import "../styles/globals.css";
import { AuthEnforcer } from "../components/nextalkauthenforcer";
import { ConditionalAppShell } from "../components/nextalkconditionalappshell";

export const metadata: Metadata = {
  title: "Solola",
  description: "Une application qui vous appartient, pour parler, partager et vous connecter à votre facon.",
  metadataBase: new URL("https://solola.app"),
  icons: {
    icon: [
      { url: "/branding/apple-touch-icon.png", sizes: "180x180", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/branding/solola-icon-192.png", sizes: "192x192", type: "image/png", media: "(prefers-color-scheme: dark)" },
      { url: "/branding/solola-icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/branding/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: [
      { url: "/branding/solola-icon-192.png", media: "(prefers-color-scheme: dark)" },
      { url: "/branding/apple-touch-icon.png", media: "(prefers-color-scheme: light)" }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preload" as="image" href="/branding/solola-logo.png" />
        <link rel="preload" as="image" href="/branding/auth-hero.jpg" />
      </head>
      <body>
        <AuthEnforcer>
          <ConditionalAppShell>{children}</ConditionalAppShell>
        </AuthEnforcer>
      </body>
    </html>
  );
}
