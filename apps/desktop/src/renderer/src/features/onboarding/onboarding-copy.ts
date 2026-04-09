export const onboardingSourceDescriptions: Record<string, string> = {
  claude: "Conversations",
  chatgpt: "Conversations",
  github: "Stars and repos",
  hn: "Upvotes and saves",
  instagram: "Saved posts and reels",
  substack: "Saved and liked posts",
  x: "Bookmarks and likes",
};

export function getOnboardingSourceDescription(sourceId: string): string {
  return (
    onboardingSourceDescriptions[sourceId] ??
    "Connect this source to bring its saved items into your library."
  );
}
