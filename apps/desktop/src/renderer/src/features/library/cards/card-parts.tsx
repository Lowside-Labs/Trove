import { useState, type PropsWithChildren } from "react";
import { cn } from "../../../lib/cn";

/* ── Avatar ─────────────────────────────────────────────── */

interface AvatarProps {
  src?: string | undefined;
  fallback?: string | undefined;
  className?: string | undefined;
}

function Avatar({ src, fallback, className }: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt=""
        className={cn(
          "size-8 shrink-0 rounded-full bg-foreground/4 object-cover",
          className,
        )}
        onError={() => setHasError(true)}
      />
    );
  }

  if (fallback) {
    return (
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/4 text-[11px] font-semibold text-muted-foreground",
          className,
        )}
      >
        {getInitials(fallback)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "size-8 shrink-0 rounded-full bg-foreground/4",
        className,
      )}
    />
  );
}

function getInitials(value: string): string {
  const parts = value
    .replace(/^@/, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

/* ── Author row ─────────────────────────────────────────── */

function Author({
  name,
  handle,
  children,
}: {
  name?: string | undefined;
  handle?: string | undefined;
  children?: React.ReactNode;
}) {
  if (!name && !handle && !children) return null;

  return (
    <div className="flex items-center gap-2.5">
      {children}
      <div className="min-w-0">
        {name ? (
          <p className="truncate text-xs font-semibold leading-tight text-card-foreground">
            {name}
          </p>
        ) : null}
        {handle ? (
          <p className="truncate text-xs leading-tight text-muted-foreground">
            @{handle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ── Title ──────────────────────────────────────────────── */

function Title({ children }: PropsWithChildren) {
  return (
    <h3 className="text-sm font-semibold leading-snug text-card-foreground">
      {children}
    </h3>
  );
}

/* ── Body ───────────────────────────────────────────────── */

function Body({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <p className={cn("line-clamp-4 text-sm text-card-foreground", className)}>
      {children}
    </p>
  );
}

/* ── Excerpt ────────────────────────────────────────────── */

function Excerpt({ children }: PropsWithChildren) {
  return (
    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

/* ── Export ──────────────────────────────────────────────── */

export const CardParts = {
  Author,
  Avatar,
  Body,
  Excerpt,
  Title,
};
