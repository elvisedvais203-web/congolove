import api from "../lib/nextalkapi";

export async function getStoryFeed() {
  const { data } = await api.get("/stories/feed");
  return data;
}

export async function createStory(
  payload: { mediaUrl: string; mediaType: "IMAGE" | "VIDEO"; caption?: string; visibility?: "PUBLIC" | "FOLLOWERS" },
  csrfToken: string
) {
  const { data } = await api.post("/stories", payload, {
    headers: { "x-csrf-token": csrfToken }
  });
  return data;
}

export async function viewStory(storyId: string, csrfToken: string) {
  const { data } = await api.post(
    "/stories/view",
    { storyId },
    { headers: { "x-csrf-token": csrfToken } }
  );
  return data;
}
