export function formatKindLabel(kindId: string): string {
  switch (kindId) {
    case "favorite-comments":
      return "Comments";
    case "favorites":
      return "Favorites";
    case "likes":
      return "Likes";
    case "bookmarks":
      return "Bookmarks";
    case "saved":
      return "Saved";
    case "star":
    case "stars":
      return "Stars";
    case "favorite":
      return "Favorites";
    default:
      return kindId
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
  }
}
