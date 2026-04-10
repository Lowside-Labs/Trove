const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

export function formatCount(value: number): string {
  return compactNumberFormatter.format(value);
}

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const shortDateWithYearFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatCardDate(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    ? shortDateFormatter.format(date)
    : shortDateWithYearFormatter.format(date);
}

export function formatDate(value?: string | null, fallback = "Unknown date"): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function formatDateTime(value?: string | null, fallback = "Not available"): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}
