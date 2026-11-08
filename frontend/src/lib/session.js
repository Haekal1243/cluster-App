const TOKEN_KEY = "accessToken";
const USER_KEY = "user";

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.navigator.standalone === true
  );
}

function migrasiKeLocalStorageJikaStandalone() {
  if (!isStandalonePwa()) return;
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  }
  const user = sessionStorage.getItem(USER_KEY);
  if (user) {
    localStorage.setItem(USER_KEY, user);
    sessionStorage.removeItem(USER_KEY);
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  migrasiKeLocalStorageJikaStandalone();
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token, remember) {
  if (typeof window === "undefined") return;
  if (remember || isStandalonePwa()) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function replaceToken(token) {
  if (typeof window === "undefined" || !token) return;
  if (localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}


export function getUser() {
  if (typeof window === "undefined") return null;
  migrasiKeLocalStorageJikaStandalone();
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUser(user, remember) {
  if (typeof window === "undefined") return;
  const pakaiSession = isStandalonePwa()
    ? false
    : remember === undefined
      ? !!sessionStorage.getItem(USER_KEY)
      : !remember;
  const [tujuan, lain] = pakaiSession ? [sessionStorage, localStorage] : [localStorage, sessionStorage];
  lain.removeItem(USER_KEY);
  tujuan.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("user-updated"));
}

export function scopeOf(user, kode) {
  return user?.permissions?.[kode] ?? null;
}

export function can(user, kode) {
  return scopeOf(user, kode) !== null;
}

export function canAny(user, kodeList) {
  return kodeList.some((k) => can(user, k));
}

export function isWargaView(user) {
  return user?.roleLevel === 3;
}

export function pakaiMenuBawah(user) {
  return !!user && (isWargaView(user) || !can(user, "ipl.read"));
}

export function isPengurusRt(user) {
  if (!user || isWargaView(user)) return false;
  return !!user.area && user.area !== "RW";
}

export function isPengurusRw(user) {
  if (!user || isWargaView(user)) return false;
  return !isPengurusRt(user);
}

export function audienceOf(user) {
  if (!user) return null;
  if (isWargaView(user)) return "warga";
  return isPengurusRt(user) ? "rt" : "rw";
}

export const AREA_LABEL = {
  RW: "RW",
  RT_01: "RT 01",
  RT_02: "RT 02",
  RT_03: "RT 03",
  RT_04: "RT 04",
};

export const areaLabel = (area) => AREA_LABEL[area] || area || "-";
