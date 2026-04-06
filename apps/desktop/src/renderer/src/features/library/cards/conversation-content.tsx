import type { LibraryItemSummary } from "trove-contracts";

interface ConversationContentProps {
  item: LibraryItemSummary;
}

export function ConversationContent({ item }: ConversationContentProps) {
  return (
    <h3 className="text-[15px] font-semibold leading-snug text-card-foreground">
      {item.title}
    </h3>
  );
}
