"use client";

import { SectionHeader } from "../../components/SectionHeader";
import Link from "next/link";
import { StoryBar } from "../../components/StoryBar";
import { AuthGuard } from "../../components/AuthGuard";
import { useState } from "react";

const storyItems = [
  { id: "1", name: "Nadine", avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f", unread: true },
  { id: "2", name: "Merveille", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80", unread: true },
  { id: "3", name: "Elie", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e" },
  { id: "4", name: "Patrick", avatar: "https://images.unsplash.com/photo-1521119989659-a83eee488004" }
];

export default function DashboardPage() {
  const [likes, setLikes] = useState<Record<string, number>>({ p1: 12, p2: 20 });
  const posts = [
    {
      id: "p1",
      author: "Nadine",
      location: "Kinshasa",
      text: "Soiree rooftop ce weekend, qui est partant ?",
      image: "https://images.unsplash.com/photo-1511578314322-379afb476865"
    },
    {
      id: "p2",
      author: "Amani",
      location: "Goma",
      text: "Cafe + discussion startup demain matin.",
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085"
    }
  ];

  return (
    <AuthGuard>
      <section>
        <SectionHeader title="Dashboard" subtitle="Feed social style Instagram + rencontres" />
        <StoryBar items={storyItems} />
        <div className="grid gap-4 md:grid-cols-3">
          {["Likes recus", "Matches", "Messages"].map((item) => (
            <article key={item} className="glass rounded-2xl p-4">
              <p className="text-sm text-slate-300">{item}</p>
              <p className="mt-2 font-heading text-3xl">0</p>
            </article>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="glass rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-heading text-lg">{post.author}</p>
                  <p className="text-xs text-slate-400">{post.location}</p>
                </div>
              </div>
              <img src={post.image} alt={post.author} className="h-72 w-full rounded-xl object-cover" loading="lazy" />
              <p className="mt-3 text-sm text-slate-200">{post.text}</p>
              <div className="mt-3 flex gap-3 text-sm">
                <button onClick={() => setLikes((prev) => ({ ...prev, [post.id]: (prev[post.id] ?? 0) + 1 }))} className="rounded-lg bg-white/10 px-3 py-1 hover:bg-white/20">❤️ {likes[post.id] ?? 0}</button>
                <button className="rounded-lg bg-white/10 px-3 py-1 hover:bg-white/20">💬 Commenter</button>
                <button className="rounded-lg bg-white/10 px-3 py-1 hover:bg-white/20">📤 Partager</button>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Link href="/likes" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">Likes</Link>
          <Link href="/matches" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">Matches</Link>
          <Link href="/notifications" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">Notifications</Link>
          <Link href="/network" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">Reseau</Link>
          <Link href="/stories" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">Stories</Link>
          <Link href="/help" className="glass rounded-xl px-4 py-3 text-sm text-slate-200 hover:text-white">Aide</Link>
        </div>
      </section>
    </AuthGuard>
  );
}
