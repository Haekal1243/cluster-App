export function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export const EVENT_NOTIF_BERUBAH = "notifikasi-berubah";
export const kabarkanNotifBerubah = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_NOTIF_BERUBAH));
};
