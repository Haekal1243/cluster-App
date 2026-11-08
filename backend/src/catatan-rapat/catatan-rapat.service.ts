import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Area, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../common/file/file.service';
import { AccessContext } from '../auth/auth.types';
import { areaFilter, assertInArea } from '../common/scope.helper';
import { CreateCatatanRapatDto, UpdateCatatanRapatDto } from './dto/catatan-rapat.dto';

@Injectable()
export class CatatanRapatService {
  constructor(
    private prisma: PrismaService,
    private files: FileService,
  ) {}

  private validasiIsiAtauFile(isiNotulen: string | null | undefined, adaFile: boolean) {
    if (!adaFile && !isiNotulen?.trim()) {
      throw new BadRequestException('Isi notulen wajib diisi kalau tidak mengunggah file.');
    }
  }

  async create(ctx: AccessContext, dto: CreateCatatanRapatDto, file?: Express.Multer.File) {
    const area: Area = areaFilter(ctx) ?? dto.area ?? ctx.user.area ?? 'RW';
    this.validasiIsiAtauFile(dto.isiNotulen, !!file);

    const fileNotulen = file ? await this.files.simpan(file) : null;
    const data = await this.prisma.catatanRapat.create({
      data: {
        area,
        judul: dto.judul,
        isiNotulen: dto.isiNotulen?.trim() || null,
        fileNotulen,
        createBy: ctx.user.nama,
      },
    });
    return { message: 'Catatan rapat berhasil disimpan', data };
  }

  private async tempelMetaFile<T extends { fileNotulen: string | null }>(rows: T[]) {
    const ids = [...new Set(rows.map((r) => r.fileNotulen).filter((id): id is string => !!id))];
    const metaList = await this.files.metadataBanyak(ids);
    const metaById = new Map(metaList.map((m) => [m.id, m]));
    return rows.map((r) => ({
      ...r,
      fileNotulenMime: r.fileNotulen ? (metaById.get(r.fileNotulen)?.mimeType ?? null) : null,
      fileNotulenNama: r.fileNotulen ? (metaById.get(r.fileNotulen)?.namaAsli ?? null) : null,
    }));
  }

  async findAll(ctx: AccessContext, params: { search?: string; area?: string } = {}) {
    const area = areaFilter(ctx);
    const and: Prisma.CatatanRapatWhereInput[] = [{ isDelete: false }];
    if (area) and.push({ area });
    else if (params.area) and.push({ area: params.area as Area });
    if (params.search?.trim()) {
      const q = params.search.trim();
      and.push({ OR: [{ judul: { contains: q } }, { isiNotulen: { contains: q } }] });
    }
    const rows = await this.prisma.catatanRapat.findMany({
      where: { AND: and },
      orderBy: { createDate: 'desc' },
    });
    return this.tempelMetaFile(rows);
  }

  async findOne(ctx: AccessContext, id: number) {
    const catatan = await this.prisma.catatanRapat.findFirst({ where: { id, isDelete: false } });
    const area = areaFilter(ctx);
    if (!catatan || (area && catatan.area !== area)) {
      throw new NotFoundException(`Catatan rapat dengan ID ${id} tidak ditemukan`);
    }
    const [withMeta] = await this.tempelMetaFile([catatan]);
    return withMeta;
  }

  async fileId(ctx: AccessContext, id: number) {
    const catatan = await this.findOne(ctx, id);
    if (!catatan.fileNotulen) throw new NotFoundException('Catatan rapat ini tidak memiliki file.');
    return catatan.fileNotulen;
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
    const fileBaru = file ? await this.files.simpan(file) : undefined;
    const lepasFileLama = dto.hapusFile === true && fileBaru === undefined;

    const isiAkhir = dto.isiNotulen !== undefined ? dto.isiNotulen : existing.isiNotulen;
    const fileAkhir = fileBaru !== undefined ? fileBaru : lepasFileLama ? null : existing.fileNotulen;
    this.validasiIsiAtauFile(isiAkhir, !!fileAkhir);

    const scopeArea = areaFilter(ctx);
    const data = await this.prisma.catatanRapat.update({
      where: { id },
      data: {
        judul: dto.judul,
        isiNotulen: dto.isiNotulen !== undefined ? dto.isiNotulen.trim() || null : undefined,
        fileNotulen: fileBaru !== undefined ? fileBaru : lepasFileLama ? null : undefined,
        ...(scopeArea === null && dto.area && { area: dto.area }),
        updateBy: ctx.user.nama,
        updateDate: new Date(),
      },
    });
    if (fileBaru || lepasFileLama) await this.files.hapus(existing.fileNotulen);
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
}
