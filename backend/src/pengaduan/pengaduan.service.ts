import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePengaduanDto } from './dto/create-pengaduan.dto';
import { RespondPengaduanDto } from './dto/respond-pengaduan.dto';
import { NotifikasiService } from '../notifikasi/notifikasi.service';

const STATUS_LABELS: Record<string, string> = {
  DIPROSES: 'Diproses',
  SELESAI: 'Selesai',
  DITOLAK: 'Ditolak',
};

@Injectable()
export class PengaduanService {
  constructor(
    private prisma: PrismaService,
    private notifikasiService: NotifikasiService,
  ) {}

  async create(
    idUser: number,
    dto: CreatePengaduanDto,
    file?: Express.Multer.File,
  ) {
    const data = await this.prisma.pengaduan.create({
      data: {
        idUser,
        judul: dto.judul,
        kategori: dto.kategori,
        deskripsi: dto.deskripsi,
        fotoUrl: file?.filename,
      },
    });

    await this.notifikasiService.kirimKeRole(
      ['ADMIN', 'PENGURUS'],
      'PENGADUAN_BARU',
      'Pengaduan Baru',
      `Pengaduan baru: "${data.judul}" perlu ditinjau.`,
      '/dashboard/pengaduan',
    );

    return { message: 'Pengaduan berhasil dikirim', data };
  }

  findAll() {
    return this.prisma.pengaduan.findMany({
      where: { isDelete: false },
      include: { pelapor: { select: { id: true, namaUser: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByUser(userId: number) {
    return this.prisma.pengaduan.findMany({
      where: { idUser: userId, isDelete: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, requester: { sub: number; role: string }) {
    const pengaduan = await this.prisma.pengaduan.findFirst({
      where: { id, isDelete: false },
      include: { pelapor: { select: { id: true, namaUser: true, email: true } } },
    });

    if (!pengaduan) {
      throw new NotFoundException(`Pengaduan dengan ID ${id} tidak ditemukan`);
    }

    if (requester.role === 'WARGA' && pengaduan.idUser !== requester.sub) {
      throw new ForbiddenException('Anda tidak berhak melihat pengaduan ini');
    }

    return pengaduan;
  }

  async respond(id: number, dto: RespondPengaduanDto) {
    const existing = await this.prisma.pengaduan.findFirst({
      where: { id, isDelete: false },
    });
    if (!existing) {
      throw new NotFoundException(`Pengaduan dengan ID ${id} tidak ditemukan`);
    }

    if (existing.status === 'SELESAI' || existing.status === 'DITOLAK') {
      throw new ForbiddenException(
        'Pengaduan yang sudah Selesai atau Ditolak tidak dapat ditanggapi lagi',
      );
    }

    const data = await this.prisma.pengaduan.update({
      where: { id },
      data: {
        status: dto.status,
        tanggapan: dto.tanggapan,
        tanggapanBy: dto.tanggapanBy,
        updatedAt: new Date(),
      },
    });

    await this.notifikasiService.kirim(
      existing.idUser,
      'PENGADUAN_DITANGGAPI',
      'Pengaduan Ditanggapi',
      `Pengaduan "${existing.judul}" kamu sudah ditanggapi: ${STATUS_LABELS[dto.status] || dto.status}.`,
      '/dashboard/pengaduan',
    );

    return { message: 'Tanggapan berhasil disimpan', data };
  }
}
