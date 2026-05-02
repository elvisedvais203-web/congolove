import Image from "next/image";

type SololaThemedLogoProps = {
  width: number;
  height: number;
  className?: string;
  alt?: string;
  priority?: boolean;
  sizes?: string;
};

export function SololaThemedLogo({
  width,
  height,
  className,
  alt = "Solola logo",
  priority = false,
  sizes
}: SololaThemedLogoProps) {
  return (
    <Image
      src="/branding/solola-logo.png"
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes ?? `${width}px`}
    />
  );
}
