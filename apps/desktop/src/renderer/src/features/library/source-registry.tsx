import type { ComponentType, SVGProps } from "react";
import type { LibraryItemSummary } from "trove-contracts";
import {
  ClaudeAI,
  GitHubDark,
  GitHubLight,
  OpenAIDark,
  OpenAILight,
  XDark,
  XLight,
} from "@ridemountainpig/svgl-react";
import { IconHackerNews } from "../../components/icons/icon-hackernews";
import { IconSubstackDark, IconSubstackLight } from "../../components/icons/icon-substack";
import { useIsDark } from "../../hooks/use-is-dark";
import { BookmarkContent } from "./cards/bookmark-content";
import { ConversationContent } from "./cards/conversation-content";
import { TweetContent } from "./cards/tweet-content";

type SvgComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface SourceConfig {
  displayName: string;
  icons: { light: SvgComponent; dark: SvgComponent };
  Content: ComponentType<{ item: LibraryItemSummary }>;
}

const registry: Record<string, SourceConfig> = {
  x: {
    displayName: "X",
    icons: { light: XLight, dark: XDark },
    Content: TweetContent,
  },
  chatgpt: {
    displayName: "ChatGPT",
    icons: { light: OpenAILight, dark: OpenAIDark },
    Content: ConversationContent,
  },
  claude: {
    displayName: "Claude",
    icons: { light: ClaudeAI, dark: ClaudeAI },
    Content: ConversationContent,
  },
  github: {
    displayName: "GitHub",
    icons: { light: GitHubLight, dark: GitHubDark },
    Content: BookmarkContent,
  },
  substack: {
    displayName: "Substack",
    icons: { light: IconSubstackLight, dark: IconSubstackDark },
    Content: BookmarkContent,
  },
  hackernews: {
    displayName: "Hacker News",
    icons: { light: IconHackerNews, dark: IconHackerNews },
    Content: BookmarkContent,
  },
};

export function getSourceConfig(source: string): SourceConfig & { isKnown: boolean } {
  const config = registry[source];
  if (config) return { ...config, isKnown: true };

  return {
    displayName: source,
    icons: { light: GitHubLight, dark: GitHubDark },
    Content: BookmarkContent,
    isKnown: false,
  };
}

/**
 * Renders the correct light/dark icon variant based on the active color scheme.
 */
export function SourceIcon({
  config,
  className,
}: {
  config: SourceConfig["icons"];
  className?: string;
}) {
  const isDark = useIsDark();
  const Icon = isDark ? config.dark : config.light;
  return <Icon className={className} />;
}
