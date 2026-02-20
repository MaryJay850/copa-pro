export function cn(...inputs: string[]) {
  return inputs.filter(Boolean).join(" ");
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-PT", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
