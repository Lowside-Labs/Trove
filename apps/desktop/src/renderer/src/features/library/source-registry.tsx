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
import { IconInstagram } from "../../components/icons/icon-instagram";
import { IconHackerNews } from "../../components/icons/icon-hackernews";
import { IconSubstackDark, IconSubstackLight } from "../../components/icons/icon-substack";
import { useIsDark } from "../../hooks/use-is-dark";
import { BookmarkContent } from "./cards/bookmark-content";
import { ConversationContent } from "./cards/conversation-content";
import { InstagramContent } from "./cards/instagram-content";
import { TweetContent } from "./cards/tweet-content";

type SvgComponent = ComponentType<SVGProps<SVGSVGElement>>;

export interface SourceConfig {
  displayName: string;
  icons: { light: SvgComponent; dark: SvgComponent };
  Content: ComponentType<{ item: LibraryItemSummary; mediaActive?: boolean }>;
}

const sourceAliases: Record<string, string> = {
  hackernews: "hn",
};

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
  instagram: {
    displayName: "Instagram",
    icons: { light: IconInstagram, dark: IconInstagram },
    Content: InstagramContent,
  },
  hn: {
    displayName: "Hacker News",
    icons: { light: IconHackerNews, dark: IconHackerNews },
    Content: BookmarkContent,
  },
};

const configCache = new Map<string, SourceConfig & { isKnown: boolean }>();

export function getSourceConfig(source: string): SourceConfig & { isKnown: boolean } {
  const normalizedSource = sourceAliases[source] ?? source;
  const cached = configCache.get(normalizedSource);
  if (cached) return cached;

  const config = registry[normalizedSource];
  const result = config
    ? { ...config, isKnown: true as const }
    : {
        displayName: normalizedSource,
        icons: { light: GitHubLight, dark: GitHubDark },
        Content: BookmarkContent,
        isKnown: false as const,
      };

  configCache.set(normalizedSource, result);
  return result;
}

/**
 * Renders the correct light/dark icon variant based on the active color scheme.
 */
export function SourceIcon({
  config,
  className,
  tone = "auto",
}: {
  config: SourceConfig["icons"];
  className?: string;
  tone?: "auto" | "light" | "dark";
}) {
  const isDark = useIsDark();
  const Icon =
    tone === "light"
      ? config.light
      : tone === "dark"
        ? config.dark
        : isDark
          ? config.dark
          : config.light;
  return <Icon className={className} />;
}
