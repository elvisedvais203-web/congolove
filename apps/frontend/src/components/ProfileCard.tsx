import Image from "next/image";

type ProfileCardProps = {
  displayName: string;
  city?: string;
  bio?: string;
  imageUrl: string;
  interests: string[];
};

export function ProfileCard({ displayName, city, bio, imageUrl, interests }: ProfileCardProps) {
  return (
    <article className="card-enter glass overflow-hidden rounded-3xl shadow-neon">
      <div className="relative h-96 w-full">
        <Image
          src={imageUrl}
          alt={displayName}
          fill
          sizes="(max-width: 768px) 100vw, 420px"
          className="object-cover"
          loading="lazy"
          unoptimized
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
          <h3 className="font-heading text-2xl text-white">{displayName}</h3>
          <p className="text-sm text-slate-200">{city ?? "RDC"}</p>
          <p className="mt-2 line-clamp-2 text-sm text-slate-300">{bio}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {interests.slice(0, 3).map((interest) => (
              <span key={interest} className="rounded-full border border-neoblue/40 bg-neoblue/15 px-3 py-1 text-xs text-neoblue">
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
