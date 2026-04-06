import { useCallback, useEffect, useState } from "react";

interface UseInfiniteScrollOptions {
  enabled?: boolean;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore(): void;
  rootMargin?: string;
}

export function useInfiniteScroll({
  enabled = true,
  hasMore,
  isLoading,
  onLoadMore,
  rootMargin = "0px 0px 120% 0px",
}: UseInfiniteScrollOptions) {
  const [node, setNode] = useState<Element | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!node || !enabled) {
      setIsInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry?.isIntersecting ?? false);
      },
      { root: null, rootMargin, threshold: 0 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [enabled, node, rootMargin]);

  useEffect(() => {
    if (!enabled || !isInView || !hasMore || isLoading) {
      return;
    }

    onLoadMore();
  }, [enabled, hasMore, isInView, isLoading, onLoadMore]);

  const sentinelRef = useCallback((nextNode: Element | null) => {
    setNode(nextNode);
  }, []);

  return {
    hasMore,
    isInView,
    sentinelRef,
  };
}
