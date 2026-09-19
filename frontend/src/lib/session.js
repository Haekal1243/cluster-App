const TOKEN_KEY = "accessToken";
const USER_KEY = "user";

export function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setToken(token, remember) {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

// ── User + hak akses ─────────────────────────────────────────────────────
// Backend adalah sumber kebenaran hak akses (tabel tb_Role_permission). Yang
// disimpan di sini hanya salinan untuk menyusun menu dan tombol; setiap aksi
// tetap divalidasi ulang oleh backend.

export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUser(user) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Kabari komponen lain (sidebar, header) di tab ini bahwa user berubah.
  window.dispatchEvent(new Event("user-updated"));
}

/** Scope permission ("ALL" | "AREA" | "OWN") atau null bila tidak punya. */
export function scopeOf(user, kode) {
  return user?.permissions?.[kode] ?? null;
}

/** Apakah user punya permission `kode` (mis. "ipl.generate")? */
export function can(user, kode) {
  return scopeOf(user, kode) !== null;
}

/** Punya salah satu dari beberapa permission? */
export function canAny(user, kodeList) {
  return kodeList.some((k) => can(user, k));
}

/** Level warga (level 3): melihat tampilan portal warga, bukan tampilan pengurus. */
export function isWargaView(user) {
  return user?.roleLevel === 3;
}

export const AREA_LABEL = {
  RW: "RW",
  RT_01: "RT 01",
  RT_02: "RT 02",
  RT_03: "RT 03",
  RT_04: "RT 04",
};

export const areaLabel = (area) => AREA_LABEL[area] || area || "-";
