"use client";

import { useEffect, useState } from "react";
import api from "../lib/nextalkapi";

type MessageItem = {
  id?: string;
  text?: string;
  mediaUrl?: string;
  createdAt?: string;
};

export function useInfiniteMessages(matchId: string) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchPage() {
      setLoading(true);
      const { data } = await api.get("/messages", { params: { matchId, page, take: 20 } });
      setMessages((prev: MessageItem[]) => [...prev, ...(data as MessageItem[])]);
      setLoading(false);
    }

    if (matchId) {
      fetchPage();
    }
  }, [matchId, page]);

  return {
    messages,
    loading,
    loadMore: () => setPage((p: number) => p + 1)
  };
}
