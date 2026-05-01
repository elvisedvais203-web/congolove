"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCsrfToken } from "../services/nextalksecurity";
import { viewStory } from "../services/nextalkstories";

export type StoryItem = {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  caption?: string;
  expiresAt: string;
  viewCount?: number;
};

type StoryGroup = {
  userId: string;
  name: string;
  avatar?: string;
  stories: StoryItem[];
};

const DURATION = 5000;

export function StoryBar({ items }: { items: StoryItem[] }) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewer, setViewer] = useState<{ groupIdx: number; storyIdx: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const map = new Map<string, StoryGroup>();
    for (const s of items) {
      if (!map.has(s.userId)) {
        map.set(s.userId, { userId: s.userId, name: s.name, avatar: s.avatar, stories: [] });
      }
      map.get(s.userId)!.stories.push(s);
    }
    setGroups([...map.values()]);
  }, [items]);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const goNext = useCallback(() => {
    setViewer((v) => {
      if (!v) return null;
      const g = groups[v.groupIdx];
      if (v.storyIdx < g.stories.length - 1) return { ...v, storyIdx: v.storyIdx + 1 };
      if (v.groupIdx < groups.length - 1) return { groupIdx: v.groupIdx + 1, storyIdx: 0 };
      return null;
    });
  }, [groups]);

  const goPrev = useCallback(() => {
    setViewer((v) => {
      if (!v) return null;
      if (v.storyIdx > 0) return { ...v, storyIdx: v.storyIdx - 1 };
      if (v.groupIdx > 0) return { groupIdx: v.groupIdx - 1, storyIdx: groups[v.groupIdx - 1].stories.length - 1 };
      return v;
    });
  }, [groups]);

  useEffect(() => {
    if (!viewer || paused) { stopTimer(); return; }
    setProgress(0);
    stopTimer();
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) { stopTimer(); goNext(); }
    }, 50);
    const story = groups[viewer.groupIdx]?.stories[viewer.storyIdx];
    if (story) fetchCsrfToken().then((csrf) => viewStory(story.id, csrf)).catch(() => null);
    return stopTimer;
  }, [viewer, paused, goNext, groups]);

  if (groups.length === 0) return null;

  const currentGroup = viewer ? groups[viewer.groupIdx] : null;
  const currentStory = currentGroup ? currentGroup.stories[viewer!.storyIdx] : null;

  return (
    <>
      {/* Viewer plein ecran */}
      {viewer && currentStory && currentGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {/* Barres progression */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3">
            {currentGroup.stories.map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: i < viewer.storyIdx ? "100%" : i === viewer.storyIdx ? `${progress}%` : "0%", transition: "none" }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-3 px-4 pt-4">
            <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-white/60 bg-white/10 flex items-center justify-center shrink-0">
              {currentGroup.avatar ? (
                <Image src={currentGroup.avatar} alt={currentGroup.name} width={36} height={36} className="object-cover" unoptimized />
              ) : (
                <span className="text-sm font-bold text-white">{currentGroup.name[0]}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{currentGroup.name}</p>
              {currentStory.expiresAt && (
                <p className="text-xs text-white/60">
                  {Math.max(0, Math.ceil((new Date(currentStory.expiresAt).getTime() - Date.now()) / 3600000))}h restantes
                </p>
              )}
            </div>
            {typeof currentStory.viewCount === "number" && (
              <span className="flex items-center gap-1 text-xs text-white/70">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {currentStory.viewCount}
              </span>
            )}
            <button onClick={() => { setViewer(null); stopTimer(); }} className="ml-2 text-white/80 hover:text-white text-xl">✕</button>
          </div>

          {/* Media */}
          <div className="absolute inset-0">
            {currentStory.mediaType === "VIDEO" ? (
              <video src={currentStory.mediaUrl} className="h-full w-full object-cover" autoPlay muted={false} playsInline />
            ) : (
              <img src={currentStory.mediaUrl} alt={currentStory.caption ?? "story"} className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          </div>

          {currentStory.caption && (
            <div className="absolute bottom-12 left-4 right-4 z-10">
              <p className="text-center text-sm text-white font-medium drop-shadow-lg">{currentStory.caption}</p>
            </div>
          )}

          {/* Nav zones */}
          <button onClick={goPrev} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" aria-label="precedent" />
          <button onClick={goNext} className="absolute right-0 top-0 bottom-0 w-1/3 z-10" aria-label="suivant" />
        </div>
      )}

      {/* Barre horizontale */}
      <div className="mb-5 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {groups.map((group, groupIdx) => (
          <button
            key={group.userId}
            onClick={() => setViewer({ groupIdx, storyIdx: 0 })}
            className="flex min-w-[72px] flex-col items-center gap-1.5 text-xs text-slate-300"
          >
            <span className="rounded-full bg-gradient-to-br from-[#ff3cac] via-neoblue to-neoviolet p-[2.5px]">
              <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#06070e] overflow-hidden">
                {group.avatar ? (
                  <Image src={group.avatar} alt={group.name} width={58} height={58} className="object-cover rounded-full" unoptimized />
                ) : (
                  <span className="text-lg font-bold text-white">{group.name[0]?.toUpperCase()}</span>
                )}
              </span>
            </span>
            <span className="max-w-[68px] truncate font-medium">{group.name}</span>
          </button>
        ))}
      </div>
    </>
  );
}
