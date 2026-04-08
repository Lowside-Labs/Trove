import { useEffect, useRef } from "react";
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
  const isVideo = Boolean(videoUrl);
  const shouldShowVideoBadge = showVideoBadge ?? isVideo;
  const mediaUrl = videoUrl ?? imageUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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
    <div className={cn("relative overflow-hidden", className)}>
      {isVideo ? (
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
        <img src={mediaUrl} alt="" className={cn("w-full object-cover", mediaClassName)} />
      )}
      {shouldShowVideoBadge ? (
        <span className="pointer-events-none absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-black/65 text-white shadow-lg backdrop-blur-sm">
          <IconPlayFilled className="size-3.5" />
        </span>
      ) : null}
    </div>
  );
}
