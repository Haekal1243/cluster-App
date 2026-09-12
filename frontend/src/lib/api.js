export const API_BASE_URL =
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

function buildFormData(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, value);
  });
  return formData;
}

export const pengumumanApi = {
  getAll: () => request("/pengumuman"),
  getActive: () => request("/pengumuman/active"),
  getById: (id) => request(`/pengumuman/${id}`),

  create: (payload) =>
    request("/pengumuman", {
      method: "POST",
      body: buildFormData(payload),
    }),

  update: (id, payload) =>
    request(`/pengumuman/${id}`, {
      method: "PATCH",
      body: buildFormData(payload),
    }),

  updateStatus: (id, status, updateBy) =>
    request(`/pengumuman/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, updateBy }),
    }),

  remove: (id) =>
    request(`/pengumuman/${id}`, {
      method: "DELETE",
    }),

  fileUrl: (filename) =>
    filename ? `${API_BASE_URL}/uploads/pengumuman/${filename}` : null,
};

export const kegiatanApi = {
  getAll: () => request("/kegiatan"),
  getActive: () => request("/kegiatan/active"),
  getById: (id) => request(`/kegiatan/${id}`),

  create: (payload) =>
    request("/kegiatan", {
      method: "POST",
      body: buildFormData(payload),
    }),

  update: (id, payload) =>
    request(`/kegiatan/${id}`, {
      method: "PATCH",
      body: buildFormData(payload),
    }),

  updateStatus: (id, status, updateBy) =>
    request(`/kegiatan/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, updateBy }),
    }),

  remove: (id) =>
    request(`/kegiatan/${id}`, {
      method: "DELETE",
    }),

  imageUrl: (filename) =>
    filename ? `${API_BASE_URL}/uploads/kegiatan/${filename}` : null,
};
