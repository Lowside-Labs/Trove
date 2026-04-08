export const onboardingSourceDescriptions: Record<string, string> = {
  claude: "Conversations",
  chatgpt: "Conversations",
  github: "Stars and repos",
  hn: "Upvotes and saves",
  instagram: "Saved posts and reels",
  substack: "Saved and liked posts",
  x: "Bookmarks and likes",
};

const SOURCE_ACCENT_COLORS: Record<string, string> = {
  claude: "#D97757",
  chatgpt: "#10A37F",
  github: "#8957E5",
  hn: "#FF6600",
  instagram: "#E1306C",
  substack: "#FF6719",
  x: "#1D9BF0",
};

export function getOnboardingSourceDescription(sourceId: string): string {
  return (
    onboardingSourceDescriptions[sourceId] ??
    "Connect this source to bring its saved items into your library."
  );
}

export function getSourceAccentColor(sourceId: string): string | undefined {
  return SOURCE_ACCENT_COLORS[sourceId];
}
