import { getToken, clearSession } from "./session";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
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
    if (response.status === 401) clearSession();
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
  getActive: ({ scope } = {}) => request(`/pengumuman/active${scope ? `?scope=${scope}` : ""}`),
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
  getActive: ({ scope } = {}) => request(`/kegiatan/active${scope ? `?scope=${scope}` : ""}`),
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

export const wargaApi = {
  // Rumah (Admin)
  getAllRumah: () => request('/warga/rumah/list'),
  createRumah: (payload) =>
    request('/warga/rumah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  updateRumah: (id, payload) =>
    request(`/warga/rumah/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deleteRumah: (id) => request(`/warga/rumah/${id}`, { method: 'DELETE' }),
  getAllUsers: () => request('/warga/users'),
};

export const portalApi = {
  // Portal Warga endpoints
  getRumahByUser: (userId) => request(`/warga/portal/rumah/${userId}`),
  getTagihanByRumah: (rumahId) => request(`/warga/portal/tagihan/${rumahId}`),
  getTagihanByUser: (userId, { bulan, tahun, dari, sampai, status, search } = {}) => {
    const params = new URLSearchParams();
    // Range diutamakan bila diberikan (mirror filter keuangan/tagihan admin)
    if (dari || sampai) {
      if (dari) params.set('dari', dari);
      if (sampai) params.set('sampai', sampai);
    } else {
      if (bulan) params.set('bulan', bulan);
      if (tahun) params.set('tahun', tahun);
    }
    if (status && status !== 'SEMUA') params.set('status', status);
    if (search) params.set('search', search);
    const qs = params.toString();
    return request(`/warga/portal/tagihan/user/${userId}${qs ? `?${qs}` : ''}`);
  },

  uploadBuktiPembayaran: (payload) => {
    const formData = buildFormData(payload);
    return request('/warga/portal/bayar', { method: 'POST', body: formData });
  },

  buktiUrl: (filename) =>
    filename ? `${API_BASE_URL}/uploads/bukti-bayar/${filename}` : null,
};

export const iplApi = {
  // Generate tagihan massal
  generate: (payload) =>
    request('/ipl/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Ambil daftar tagihan dengan filter opsional (bulan+tahun tunggal atau range dari/sampai YYYY-MM)
  getAll: ({ bulan, tahun, dari, sampai, status, search } = {}) => {
    const params = new URLSearchParams();
    if (dari || sampai) {
      if (dari) params.set('dari', dari);
      if (sampai) params.set('sampai', sampai);
    } else {
      if (bulan) params.set('bulan', bulan);
      if (tahun) params.set('tahun', tahun);
    }
    if (status && status !== 'SEMUA') params.set('status', status);
    if (search) params.set('search', search);
    const qs = params.toString();
    return request(`/ipl${qs ? `?${qs}` : ''}`);
  },

  // Statistik ringkasan untuk dashboard (filter rentang periode YYYY-MM, maks 12 bulan)
  getDashboardStats: ({ dari, sampai } = {}) => {
    const params = new URLSearchParams();
    if (dari) params.set('dari', dari);
    if (sampai) params.set('sampai', sampai);
    const qs = params.toString();
    return request(`/ipl/dashboard-stats${qs ? `?${qs}` : ''}`);
  },

  // Konfirmasi atau tolak pembayaran
  konfirmasi: (pembayaranId, payload) =>
    request(`/ipl/konfirmasi/${pembayaranId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};

export const keuanganApi = {
  // Riwayat transaksi kas manual dengan filter opsional
  getAll: ({ dari, sampai, tipe, kategori, search } = {}) => {
    const params = new URLSearchParams();
    if (dari) params.set('dari', dari);
    if (sampai) params.set('sampai', sampai);
    if (tipe && tipe !== 'SEMUA') params.set('tipe', tipe);
    if (kategori && kategori !== 'SEMUA') params.set('kategori', kategori);
    if (search) params.set('search', search);
    const qs = params.toString();
    return request(`/keuangan${qs ? `?${qs}` : ''}`);
  },

  // Ringkasan IPL otomatis + kas manual (filter rentang periode YYYY-MM)
  getRingkasan: ({ dari, sampai } = {}) => {
    const params = new URLSearchParams();
    if (dari) params.set('dari', dari);
    if (sampai) params.set('sampai', sampai);
    const qs = params.toString();
    return request(`/keuangan/ringkasan${qs ? `?${qs}` : ''}`);
  },

  getById: (id) => request(`/keuangan/${id}`),

  create: (payload) =>
    request('/keuangan', {
      method: 'POST',
      body: buildFormData(payload),
    }),

  update: (id, payload) =>
    request(`/keuangan/${id}`, {
      method: 'PATCH',
      body: buildFormData(payload),
    }),

  remove: (id) =>
    request(`/keuangan/${id}`, {
      method: 'DELETE',
    }),

  buktiUrl: (filename) =>
    filename ? `${API_BASE_URL}/uploads/keuangan/${filename}` : null,
};

export const pengaduanApi = {
  getAll: () => request("/pengaduan"),
  getByUser: (userId) => request(`/pengaduan/user/${userId}`),
  getById: (id) => request(`/pengaduan/${id}`),

  create: (payload) =>
    request("/pengaduan", {
      method: "POST",
      body: buildFormData(payload),
    }),

  respond: (id, payload) =>
    request(`/pengaduan/${id}/respond`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  imageUrl: (filename) =>
    filename ? `${API_BASE_URL}/uploads/pengaduan/${filename}` : null,
};

export const notifikasiApi = {
  getAll: () => request("/notifikasi"),
  markRead: (id) => request(`/notifikasi/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request("/notifikasi/read-all", { method: "PATCH" }),
};


