export function formatKindLabel(kindId: string): string {
  switch (kindId) {
    case "upvoted-comment":
    case "upvoted-comments":
      return "Comments";
    case "upvoted":
      return "Upvoted";
    case "likes":
    case "like":
      return "Likes";
    case "bookmarks":
    case "bookmark":
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
