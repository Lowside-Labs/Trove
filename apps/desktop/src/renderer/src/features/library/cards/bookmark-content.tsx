import type { LibraryItemSummary } from "trove-contracts";
import { CardParts } from "./card-parts";

interface BookmarkContentProps {
  item: LibraryItemSummary;
}

export function BookmarkContent({ item }: BookmarkContentProps) {
  return (
    <>
      <CardParts.Title>{item.title}</CardParts.Title>
      {item.excerpt ? (
        <CardParts.Excerpt>{item.excerpt}</CardParts.Excerpt>
      ) : null}
    </>
  );
}
