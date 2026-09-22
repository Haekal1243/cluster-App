// Data awal RBAC. Sumber: matriks hak akses hasil wawancara dengan Ketua RT dan
// Bendahara RW. Setelah di-seed, matriks disimpan di database dan bisa diubah
// admin lewat menu; file ini hanya nilai awal.

export type ScopeKode = 'ALL' | 'AREA' | 'OWN';

export const ROLES = [
  { kode: 'ADMIN', nama: 'Admin', level: 0 },
  { kode: 'KETUA_RW', nama: 'Ketua RW', level: 1 },
  { kode: 'BENDAHARA_RW', nama: 'Bendahara RW', level: 1 },
  { kode: 'SEKRE_RW', nama: 'Sekretaris RW', level: 1 },
  { kode: 'KETUA_RT', nama: 'Ketua RT', level: 2 },
  { kode: 'BENDAHARA_RT', nama: 'Bendahara RT', level: 2 },
  { kode: 'SEKRE_RT', nama: 'Sekretaris RT', level: 2 },
  { kode: 'WARGA', nama: 'Warga', level: 3 },
] as const;

// menu -> aksi -> keterangan
export const PERMISSIONS: Record<string, Record<string, string>> = {
  warga: {
    read: 'Lihat data warga',
    create: 'Tambah warga (akun + data diri)',
    update: 'Ubah data warga',
    delete: 'Hapus warga',
    reset_password: 'Atur ulang kata sandi warga',
    approve_registrasi: 'Setujui/tolak pendaftaran mandiri warga',
  },
  ipl: {
    read: 'Lihat tagihan IPL',
    generate: 'Generate tagihan IPL per periode',
    update: 'Ubah tagihan IPL',
    delete: 'Hapus tagihan IPL',
    konfirmasi: 'Konfirmasi pembayaran IPL warga',
    konfirmasi_pengurus: 'Konfirmasi pembayaran IPL milik pengurus (bukan warga biasa)',
    bayar: 'Kirim bukti pembayaran IPL',
  },
  setoran: {
    read: 'Lihat setoran IPL RT ke RW',
    create: 'Setor IPL RT ke RW (upload bukti)',
    konfirmasi: 'Konfirmasi setoran IPL dari RT',
  },
  keuangan: {
    read: 'Lihat keuangan',
    create: 'Tambah transaksi kas',
    update: 'Ubah transaksi kas',
    delete: 'Hapus transaksi kas',
  },
  pengaduan: {
    create_rw: 'Buat pengaduan ke RW',
    create_rt: 'Buat pengaduan ke RT',
    read: 'Lihat pengaduan',
    respon: 'Tanggapi pengaduan',
  },
  kegiatan: {
    read: 'Lihat kegiatan',
    create: 'Buat kegiatan',
    update: 'Ubah kegiatan',
    delete: 'Hapus kegiatan',
    ajukan: 'Ajukan kegiatan tampil ke seluruh RW',
    approve: 'Setujui/tolak pengajuan kegiatan ke seluruh RW',
  },
  pengumuman: {
    read: 'Lihat pengumuman',
    create: 'Buat pengumuman',
    update: 'Ubah pengumuman',
    delete: 'Hapus pengumuman',
    ajukan: 'Ajukan pengumuman tampil ke seluruh RW',
    approve: 'Setujui/tolak pengajuan pengumuman ke seluruh RW',
  },
  catatan_rapat: {
    read: 'Lihat catatan rapat',
    create: 'Buat catatan rapat',
    update: 'Ubah catatan rapat',
    delete: 'Hapus catatan rapat',
  },
  role: {
    manage: 'Kelola role dan matriks permission',
  },
  pengurus: {
    manage: 'Tetapkan jabatan pengurus RW/RT',
  },
};

// [kode permission ("menu.aksi"), scope]
type Grant = [kode: string, scope: ScopeKode];

const CRUD = (menu: string, scope: ScopeKode): Grant[] => [
  [`${menu}.read`, scope],
  [`${menu}.create`, scope],
  [`${menu}.update`, scope],
  [`${menu}.delete`, scope],
];

// Catatan scope:
//  - catatan_rapat: AREA. Sekre/Ketua/Bendahara RW berarea RW jadi hanya melihat
//    notulen RW; pengurus RT hanya notulen RT-nya. RW dan RT tidak saling lihat.
//  - kegiatan/pengumuman: read AREA = milik RT sendiri + yang sudah di-ACC RW
//    (aturan "yang di-ACC RW" ditangani di service, bukan di scope).
//  - keuangan Bendahara RW: baca ALL (rekap per RT), tulis AREA (kas RW sendiri).
export const MATRIX: Record<string, Grant[]> = {
  KETUA_RW: [
    ['warga.read', 'ALL'],
    ['ipl.read', 'ALL'],
    ['ipl.bayar', 'OWN'],
    ['setoran.read', 'ALL'],
    ['keuangan.read', 'ALL'],
    // AREA (bukan ALL): pengurus RW tidak boleh melihat/menanggapi pengaduan bertujuan RT
    // (lihat Bagian 2 rencana). Ke RT tetap bisa mengadu (dia warga RT tempat rumahnya).
    ['pengaduan.read', 'AREA'],
    ['pengaduan.respon', 'AREA'],
    ['pengaduan.create_rt', 'OWN'],
    ...CRUD('kegiatan', 'ALL'),
    ['kegiatan.approve', 'ALL'],
    ...CRUD('pengumuman', 'ALL'),
    ['pengumuman.approve', 'ALL'],
    ['catatan_rapat.read', 'AREA'],
  ],
  BENDAHARA_RW: [
    ['warga.read', 'ALL'],
    ['ipl.read', 'ALL'],
    ['ipl.bayar', 'OWN'],
    ['setoran.read', 'ALL'],
    ['setoran.konfirmasi', 'ALL'],
    ['keuangan.read', 'ALL'],
    ['keuangan.create', 'AREA'],
    ['keuangan.update', 'AREA'],
    ['keuangan.delete', 'AREA'],
    ['pengaduan.read', 'AREA'],
    ['pengaduan.create_rt', 'OWN'],
    ['kegiatan.read', 'ALL'],
    ['pengumuman.read', 'ALL'],
    ['catatan_rapat.read', 'AREA'],
  ],
  SEKRE_RW: [
    ['warga.read', 'ALL'],
    ['ipl.read', 'ALL'],
    ['ipl.bayar', 'OWN'],
    ['keuangan.read', 'AREA'],
    ['pengaduan.read', 'AREA'],
    ['pengaduan.respon', 'AREA'],
    ['pengaduan.create_rt', 'OWN'],
    ...CRUD('kegiatan', 'ALL'),
    ['kegiatan.approve', 'ALL'],
    ...CRUD('pengumuman', 'ALL'),
    ['pengumuman.approve', 'ALL'],
    ...CRUD('catatan_rapat', 'AREA'),
  ],
  KETUA_RT: [
    ...CRUD('warga', 'AREA'),
    ['warga.reset_password', 'AREA'],
    ['warga.approve_registrasi', 'AREA'],
    ['ipl.read', 'AREA'],
    ['ipl.bayar', 'OWN'],
    ['ipl.konfirmasi_pengurus', 'AREA'],
    ['setoran.read', 'AREA'],
    ['keuangan.read', 'AREA'],
    ['pengaduan.read', 'AREA'],
    ['pengaduan.respon', 'AREA'],
    ['pengaduan.create_rw', 'OWN'],
    ['kegiatan.read', 'AREA'],
    ['pengumuman.read', 'AREA'],
    ['catatan_rapat.read', 'AREA'],
  ],
  BENDAHARA_RT: [
    ['warga.read', 'AREA'],
    ['ipl.read', 'AREA'],
    ['ipl.generate', 'AREA'],
    ['ipl.update', 'AREA'],
    ['ipl.delete', 'AREA'],
    ['ipl.konfirmasi', 'AREA'],
    ['ipl.konfirmasi_pengurus', 'AREA'],
    ['ipl.bayar', 'OWN'],
    ['setoran.read', 'AREA'],
    ['setoran.create', 'AREA'],
    ...CRUD('keuangan', 'AREA'),
    ['pengaduan.read', 'AREA'],
    ['pengaduan.create_rw', 'OWN'],
    ['kegiatan.read', 'AREA'],
    ['pengumuman.read', 'AREA'],
    ['catatan_rapat.read', 'AREA'],
  ],
  SEKRE_RT: [
    ...CRUD('warga', 'AREA'),
    ['warga.reset_password', 'AREA'],
    ['warga.approve_registrasi', 'AREA'],
    ['ipl.read', 'AREA'],
    ['ipl.bayar', 'OWN'],
    ['keuangan.read', 'AREA'],
    ['pengaduan.read', 'AREA'],
    ['pengaduan.create_rw', 'OWN'],
    ...CRUD('kegiatan', 'AREA'),
    ['kegiatan.ajukan', 'AREA'],
    ...CRUD('pengumuman', 'AREA'),
    ['pengumuman.ajukan', 'AREA'],
    ...CRUD('catatan_rapat', 'AREA'),
  ],
  WARGA: [
    ['ipl.read', 'OWN'],
    ['ipl.bayar', 'OWN'],
    ['pengaduan.create_rw', 'OWN'],
    ['pengaduan.create_rt', 'OWN'],
    ['pengaduan.read', 'OWN'],
    ['kegiatan.read', 'AREA'],
    ['pengumuman.read', 'AREA'],
  ],
  // ADMIN hanya mengelola sistem aplikasi (bukan urusan RT/RW): matriks role, penetapan
  // pengurus, dan data warga. Tidak punya akses tagihan, keuangan, pengaduan, kegiatan, dll.
  ADMIN: [
    ['role.manage', 'ALL'],
    ['pengurus.manage', 'ALL'],
    ['warga.read', 'ALL'],
    ['warga.create', 'ALL'],
    ['warga.update', 'ALL'],
    ['warga.delete', 'ALL'],
    ['warga.reset_password', 'ALL'],
  ],
};
