const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    throw new Error(
      "Tidak dapat terhubung ke server. Pastikan server backend berjalan.",
      { cause: error },
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const message = body?.message || "Terjadi kesalahan pada server.";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return body;
}

export const wargaApi = {
  // ── Rumah ─────────────────────────────────────────────────────────
  getAllRumah: () => request("/warga/rumah/list"),

  createRumah: (payload) =>
    request("/warga/rumah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  updateRumah: (id, payload) =>
    request(`/warga/rumah/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  removeRumah: (id) =>
    request(`/warga/rumah/${id}`, { method: "DELETE" }),

  // ── Users (dropdown pemilik) ───────────────────────────────────────
  getAllUsers: () => request("/warga/users"),
};
