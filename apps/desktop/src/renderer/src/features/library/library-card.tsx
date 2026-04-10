import { memo, useState } from "react";
import type { LibraryItemSummary } from "trove-contracts";
import { getSourceConfig } from "./source-registry";
import { CardFooter } from "./cards/card-footer";

interface LibraryCardProps {
  item: LibraryItemSummary;
  onOpen(): void;
}

export const LibraryCard = memo(function LibraryCard({ item, onOpen }: LibraryCardProps) {
  const source = getSourceConfig(item.source);
  const Content = source.Content;
  const [mediaActive, setMediaActive] = useState(false);

  return (
    <button
      className="flex cursor-pointer flex-col gap-3 rounded-2xl bg-card p-5 text-left hover:bg-accent"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 350px" }}
      type="button"
      onClick={onOpen}
      onPointerEnter={() => setMediaActive(true)}
      onPointerLeave={() => setMediaActive(false)}
      onFocus={() => setMediaActive(true)}
      onBlur={() => setMediaActive(false)}
    >
      <Content item={item} mediaActive={mediaActive} />
      <CardFooter item={item} />
    </button>
  );
});
