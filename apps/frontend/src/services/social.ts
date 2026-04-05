import api from "../lib/api";

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
