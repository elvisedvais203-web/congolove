import api from "../lib/nextalkapi";

export async function getNetwork() {
  const { data } = await api.get("/social/network");
  return data;
}

export async function getSuggestions(limit = 12) {
  const { data } = await api.get("/social/suggestions", { params: { limit } });
  return data;
}

export async function followUser(followingId: string, csrfToken: string) {
  const { data } = await api.post(
    "/social/follow",
    { followingId },
    { headers: { "x-csrf-token": csrfToken } }
  );
  return data;
}

export async function unfollowUser(followingId: string, csrfToken: string) {
  const { data } = await api.post(
    "/social/unfollow",
    { followingId },
    { headers: { "x-csrf-token": csrfToken } }
  );
  return data;
}

export async function getFeed(limit = 20) {
  const { data } = await api.get("/social/feed", { params: { limit } });
  return data;
}

export async function getSavedFeed(limit = 30) {
  const { data } = await api.get("/social/feed/saved", { params: { limit } });
  return data;
}

export async function createFeedPost(payload: { content: string; mediaUrl?: string }, csrfToken: string) {
  const { data } = await api.post("/social/feed", payload, {
    headers: { "x-csrf-token": csrfToken }
  });
  return data;
}

export async function likeFeedPost(postId: string, csrfToken: string) {
  const { data } = await api.post(`/social/feed/${postId}/like`, {}, {
    headers: { "x-csrf-token": csrfToken }
  });
  return data;
}

export async function saveFeedPost(postId: string, csrfToken: string) {
  const { data } = await api.post(`/social/feed/${postId}/save`, {}, {
    headers: { "x-csrf-token": csrfToken }
  });
  return data;
}

export async function commentFeedPost(postId: string, content: string, csrfToken: string) {
  const { data } = await api.post(
    `/social/feed/${postId}/comment`,
    { content },
    {
      headers: { "x-csrf-token": csrfToken }
    }
  );
  return data;
}
