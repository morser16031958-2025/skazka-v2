import { Story } from "../types";

// Placeholder for database service
// This will be called from the backend server
export async function fetchStories(): Promise<Story[]> {
  const response = await fetch("/api/stories");
  return response.json();
}

export async function saveStory(story: Story): Promise<Story> {
  const response = await fetch("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(story),
  });
  return response.json();
}

export async function deleteStory(storyId: string): Promise<void> {
  await fetch(`/api/stories/${storyId}`, {
    method: "DELETE",
  });
}
