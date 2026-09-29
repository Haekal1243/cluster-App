// One-time backfill: impor file legacy dari backend/uploads/** ke tb_File,
// lalu tulis ulang referensi (nama file -> id tb_File).
// Jalankan sekali dari folder backend: node prisma/backfill-files.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const UPLOADS = path.join(__dirname, '..', 'uploads');

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

// tabel, kolom, folder, publik
const TARGETS = [
  { model: 'setoranIpl', column: 'buktiTransaksi', dir: 'setoran', publik: false, idCol: 'id' },
  { model: 'pembayaranIpl', column: 'buktiTransaksi', dir: 'bukti-bayar', publik: false, idCol: 'idPembayaran' },
  { model: 'kegiatan', column: 'gambarUrl', dir: 'kegiatan', publik: true, idCol: 'id' },
];

async function main() {
  const prisma = new PrismaClient();
  let created = 0;
  let updated = 0;
  let missing = 0;
  try {
    for (const t of TARGETS) {
      const all = await prisma[t.model].findMany({
        select: { [t.idCol]: true, [t.column]: true },
      });
      const rows = all.filter((r) => r[t.column]);
      for (const r of rows) {
        const ref = r[t.column];
        if (!ref) continue;
        // Lewati yang sudah berupa id tb_File.
        const existing = await prisma.file.findUnique({ where: { id: ref }, select: { id: true } }).catch(() => null);
        if (existing) continue;
        const filePath = path.join(UPLOADS, t.dir, ref);
        if (!fs.existsSync(filePath)) {
          console.log(`HILANG: ${t.model}#${r[t.idCol]} -> ${t.dir}/${ref}`);
          missing++;
          continue;
        }
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(ref).toLowerCase();
        const row = await prisma.file.create({
          data: {
            namaAsli: ref,
            mimeType: MIME[ext] || 'application/octet-stream',
            ukuran: buf.length,
            publik: t.publik,
            data: buf,
          },
          select: { id: true },
        });
        await prisma[t.model].update({
          where: { [t.idCol]: r[t.idCol] },
          data: { [t.column]: row.id },
        });
        created++;
        updated++;
      }
    }
    console.log(`Selesai. file dibuat: ${created}, referensi diperbarui: ${updated}, file hilang: ${missing}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error('GAGAL:', e.message); process.exit(1); });
