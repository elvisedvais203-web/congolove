"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type SololaThemedLogoProps = {
  width: number;
  height: number;
  className?: string;
  alt?: string;
  priority?: boolean;
};

export function SololaThemedLogo({ width, height, className, alt = "Solola logo", priority = false }: SololaThemedLogoProps) {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setDarkMode(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const src = darkMode ? "/branding/solola-logo.png" : "/branding/apple-touch-icon.png";

  return <Image src={src} alt={alt} width={width} height={height} className={className} priority={priority} />;
}
