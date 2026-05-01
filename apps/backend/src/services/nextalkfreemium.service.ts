const FREE_LIMITS = {
  likesPerDay: 25,
  messagesPerDay: 40
};

export function checkFreemiumLimit(
  tier: "FREE" | "PREMIUM",
  action: "likes" | "messages",
  todayUsage: number
): { allowed: boolean; limit: number | null } {
  if (tier === "PREMIUM") {
    return { allowed: true, limit: null };
  }

  const limit = action === "likes" ? FREE_LIMITS.likesPerDay : FREE_LIMITS.messagesPerDay;
  return { allowed: todayUsage < limit, limit };
}
