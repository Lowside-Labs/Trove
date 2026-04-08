import type { LibraryItemSummary } from "trove-contracts";

interface BookmarkContentProps {
  item: LibraryItemSummary;
}

export function BookmarkContent({ item }: BookmarkContentProps) {
  return (
    <>
      <h3 className="text-[15px] font-semibold leading-snug text-card-foreground">
        {item.title}
      </h3>
      {item.excerpt ? (
        <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
          {item.excerpt}
        </p>
      ) : null}
    </>
  );
}
