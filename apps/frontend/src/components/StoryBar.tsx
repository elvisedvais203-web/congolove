import Image from "next/image";

type StoryUser = {
  id: string;
  name: string;
  avatar: string;
  unread?: boolean;
};

export function StoryBar({ items }: { items: StoryUser[] }) {
  return (
    <div className="mb-5 flex gap-3 overflow-x-auto pb-2">
      {items.map((item) => (
        <button key={item.id} className="flex min-w-20 flex-col items-center gap-2 text-xs text-slate-300">
          <span
            className={`rounded-full p-[2px] ${item.unread ? "bg-gradient-to-br from-neoblue to-neoviolet" : "bg-white/20"}`}
          >
            <span className="relative block h-14 w-14 overflow-hidden rounded-full bg-black">
              <Image src={item.avatar} alt={item.name} fill sizes="56px" className="object-cover" loading="lazy" unoptimized />
            </span>
          </span>
          <span className="max-w-16 truncate">{item.name}</span>
        </button>
      ))}
    </div>
  );
}
