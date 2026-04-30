import Image from "next/image";

type ProfileCardProps = {
  displayName: string;
  city?: string;
  bio?: string;
  imageUrl: string;
  interests: string[];
  verified?: boolean;
  online?: boolean;
  compatibilityPercent?: number;
};

export function ProfileCard({ displayName, city, bio, imageUrl, interests, verified, online, compatibilityPercent }: ProfileCardProps) {
  return (
    <article className="card-enter card-hover glass overflow-hidden rounded-3xl neon-border group">
      <div className="relative h-96 w-full overflow-hidden">
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {online && (
            <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-[#39ff14] backdrop-blur-sm">
              <span className="online-dot inline-block h-2 w-2 rounded-full" />
              En ligne
            </span>
          )}
        </div>
        {(verified || compatibilityPercent !== undefined) && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {verified && (
              <span className="rounded-full bg-neoblue/20 px-2.5 py-1 text-xs font-semibold text-neoblue neon-border backdrop-blur-sm">
                ✓ Vérifié
              </span>
            )}
            {compatibilityPercent !== undefined && (
              <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-gold backdrop-blur-sm">
                {compatibilityPercent}% compat
              </span>
            )}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <h3 className="font-heading text-2xl font-bold text-white drop-shadow">{displayName}</h3>
          <p className="mt-0.5 text-sm text-slate-300">{city ?? "RDC"}</p>
          {bio && <p className="mt-1.5 line-clamp-2 text-sm text-slate-300/90">{bio}</p>}
          {interests.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {interests.slice(0, 4).map((interest) => (
                <span key={interest} className="badge-neon">
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
