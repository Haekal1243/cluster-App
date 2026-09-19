import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Area, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccessContext } from '../auth/auth.types';
import { areaFilter, assertInArea } from '../common/scope.helper';
import { CreateCatatanRapatDto, UpdateCatatanRapatDto } from './dto/catatan-rapat.dto';

@Injectable()
export class CatatanRapatService {
  constructor(private prisma: PrismaService) {}

  async create(ctx: AccessContext, dto: CreateCatatanRapatDto, file?: Express.Multer.File) {
    const area: Area = areaFilter(ctx) ?? dto.area ?? ctx.user.area ?? 'RW';

    const data = await this.prisma.catatanRapat.create({
      data: {
        area,
        judul: dto.judul,
        isiNotulen: dto.isiNotulen,
        fileNotulen: file?.filename ?? null,
        createBy: ctx.user.nama,
      },
    });
    return { message: 'Catatan rapat berhasil disimpan', data };
  }

  /** Notulen RW hanya terlihat pengurus RW, notulen RT hanya di RT itu (lewat scope AREA). */
  findAll(ctx: AccessContext, params: { search?: string; area?: string } = {}) {
    const area = areaFilter(ctx);
    const and: Prisma.CatatanRapatWhereInput[] = [{ isDelete: false }];
    if (area) and.push({ area });
    else if (params.area) and.push({ area: params.area as Area });
    if (params.search?.trim()) {
      const q = params.search.trim();
      and.push({ OR: [{ judul: { contains: q } }, { isiNotulen: { contains: q } }] });
    }
    return this.prisma.catatanRapat.findMany({
      where: { AND: and },
      orderBy: { createDate: 'desc' },
    });
  }

  async findOne(ctx: AccessContext, id: number) {
    const catatan = await this.prisma.catatanRapat.findFirst({ where: { id, isDelete: false } });
    // 404 (bukan 403) untuk data di luar wilayah, supaya keberadaan notulen tidak bocor.
    const area = areaFilter(ctx);
    if (!catatan || (area && catatan.area !== area)) {
      throw new NotFoundException(`Catatan rapat dengan ID ${id} tidak ditemukan`);
    }
    return catatan;
  }

  /** Path file notulen; dicek scope dulu, karena folder ini tidak disajikan sebagai file statis publik. */
  async filePath(ctx: AccessContext, id: number) {
    const catatan = await this.findOne(ctx, id);
    if (!catatan.fileNotulen) throw new NotFoundException('Catatan rapat ini tidak memiliki file.');
    const full = path.join(process.cwd(), 'uploads', 'catatan-rapat', catatan.fileNotulen);
    if (!fs.existsSync(full)) throw new NotFoundException('File notulen tidak ditemukan.');
    return full;
  }

  private async findForWrite(ctx: AccessContext, id: number) {
    const catatan = await this.prisma.catatanRapat.findFirst({ where: { id, isDelete: false } });
    if (!catatan) throw new NotFoundException(`Catatan rapat dengan ID ${id} tidak ditemukan`);
    assertInArea(ctx, catatan.area);
    return catatan;
  }

  async update(
    ctx: AccessContext,
    id: number,
    dto: UpdateCatatanRapatDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.findForWrite(ctx, id);
    if (file && existing.fileNotulen) this.deleteFile(existing.fileNotulen);

    const scopeArea = areaFilter(ctx);
    const data = await this.prisma.catatanRapat.update({
      where: { id },
      data: {
        judul: dto.judul,
        isiNotulen: dto.isiNotulen,
        fileNotulen: file?.filename,
        // Area hanya bisa dipindah oleh scope ALL; pengurus tidak bisa memindah notulen ke area lain.
        ...(scopeArea === null && dto.area && { area: dto.area }),
        updateBy: ctx.user.nama,
        updateDate: new Date(),
      },
    });
    return { message: 'Catatan rapat berhasil diperbarui', data };
  }

  async remove(ctx: AccessContext, id: number) {
    await this.findForWrite(ctx, id);
    await this.prisma.catatanRapat.update({
      where: { id },
      data: { isDelete: true, updateBy: ctx.user.nama, updateDate: new Date() },
    });
    return { message: 'Catatan rapat berhasil dihapus' };
  }

  private deleteFile(filename: string) {
    const filePath = path.join(process.cwd(), 'uploads', 'catatan-rapat', filename);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, () => undefined);
    }
  }
}
