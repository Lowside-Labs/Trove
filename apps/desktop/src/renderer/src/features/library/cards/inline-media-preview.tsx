import { useEffect, useRef, useState } from "react";
import IconPlayFilled from "central-icons-filled/IconPlay";
import { cn } from "../../../lib/cn";

interface InlineMediaPreviewProps {
  active: boolean;
  className?: string;
  mediaClassName: string;
  showVideoBadge?: boolean;
  imageUrl?: string;
  videoUrl?: string;
}

export function InlineMediaPreview({
  active,
  className,
  mediaClassName,
  showVideoBadge,
  imageUrl,
  videoUrl,
}: InlineMediaPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVideo = Boolean(videoUrl);
  const shouldShowVideoBadge = showVideoBadge ?? isVideo;
  const mediaUrl = videoUrl ?? imageUrl;
  const [shouldLoad, setShouldLoad] = useState(active);

  useEffect(() => {
    if (shouldLoad) {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (active) {
      setShouldLoad(true);
    }
  }, [active]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    if (active) {
      if (video.readyState < 2) {
        video.load();
      }
      void video.play().catch(() => {});
      return;
    }

    video.pause();
    video.currentTime = 0;
  }, [active]);

  if (!mediaUrl) {
    return null;
  }

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {shouldLoad ? isVideo ? (
        <video
          ref={videoRef}
          className={cn("w-full object-cover", mediaClassName)}
          src={videoUrl}
          muted
          loop
          playsInline
          preload={active ? "auto" : "metadata"}
          poster={imageUrl}
        />
      ) : (
        <img
          src={mediaUrl}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className={cn("w-full object-cover", mediaClassName)}
        />
      ) : (
        <div className={cn("w-full bg-muted/70", mediaClassName)} />
      )}
      {shouldShowVideoBadge ? (
        <span className="pointer-events-none absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-black/65 text-white shadow-lg backdrop-blur-sm">
          <IconPlayFilled className="size-3.5" />
        </span>
      ) : null}
    </div>
  );
}
