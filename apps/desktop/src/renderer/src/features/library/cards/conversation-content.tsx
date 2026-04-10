import type { LibraryItemSummary } from "trove-contracts";
import { CardParts } from "./card-parts";

interface ConversationContentProps {
  item: LibraryItemSummary;
}

export function ConversationContent({ item }: ConversationContentProps) {
  return <CardParts.Title>{item.title}</CardParts.Title>;
}
