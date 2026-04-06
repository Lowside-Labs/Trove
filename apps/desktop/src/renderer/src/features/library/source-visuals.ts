const sourceVisualMap: Record<
  string,
  {
    accent: string;
    badge: string;
    glow: string;
  }
> = {
  x: {
    accent: "text-sky-700",
    badge: "bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/18",
    glow: "from-sky-500/24 via-cyan-400/14 to-transparent",
  },
  chatgpt: {
    accent: "text-emerald-700",
    badge: "bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/18",
    glow: "from-emerald-500/24 via-lime-400/14 to-transparent",
  },
  claude: {
    accent: "text-amber-700",
    badge: "bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/18",
    glow: "from-amber-500/24 via-orange-400/14 to-transparent",
  },
  github: {
    accent: "text-violet-700",
    badge: "bg-violet-500/12 text-violet-700 ring-1 ring-violet-500/18",
    glow: "from-violet-500/24 via-fuchsia-400/14 to-transparent",
  },
};

const defaultVisual = {
  accent: "text-zinc-700",
  badge: "bg-zinc-900/6 text-zinc-700 ring-1 ring-black/8",
  glow: "from-zinc-900/10 via-zinc-400/10 to-transparent",
};

export function getSourceVisuals(source: string) {
  return sourceVisualMap[source] ?? defaultVisual;
}
