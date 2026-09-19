import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Area } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { LEVEL_ADMIN, LEVEL_WARGA } from '../common/helpers';
import { AssignPengurusDto, VacatePengurusDto } from './rbac.dto';

const AREA_RT: Area[] = ['RT_01', 'RT_02', 'RT_03', 'RT_04'];
const label = (a: Area) => a.replace('_', ' ');

/** Area yang valid untuk sebuah role: level 1 = RW, level 2 = tiap RT. */
function areaUntukLevel(level: number): Area[] {
  if (level === 1) return ['RW'];
  if (level === 2) return AREA_RT;
  return [];
}

@Injectable()
export class PengurusService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async roleWarga() {
    const role = await this.prisma.role.findFirst({
      where: { level: LEVEL_WARGA, isSystem: true },
    });
    if (!role) throw new BadRequestException('Peran warga belum tersedia. Jalankan seed database.');
    return role;
  }

  // ================================================================
  // DAFTAR JABATAN — tiap role RW/RT x area, beserta pemegangnya
  // ================================================================

  async slots() {
    const roles = await this.prisma.role.findMany({
      where: { level: { in: [1, 2] } },
      orderBy: [{ level: 'asc' }, { id: 'asc' }],
    });
    const pemegang = await this.prisma.user.findMany({
      where: { roleId: { in: roles.map((r) => r.id) } },
      select: { id: true, namaUser: true, username: true, noTelp: true, roleId: true, area: true },
    });

    return roles.flatMap((role) =>
      areaUntukLevel(role.level).map((area) => ({
        role: { id: role.id, kode: role.kode, nama: role.nama, level: role.level },
        area,
        pemegang: pemegang.find((p) => p.roleId === role.id && p.area === area) ?? null,
      })),
    );
  }

  /** Calon pemegang jabatan: warga biasa. Untuk jabatan RT, hanya warga RT itu. */
  kandidat(area?: Area) {
    return this.prisma.user.findMany({
      where: {
        role: { level: LEVEL_WARGA },
        ...(area && area !== 'RW' && { area }),
      },
      select: {
        id: true,
        namaUser: true,
        username: true,
        area: true,
        rumah: { where: { isDelete: false }, select: { blokRumah: true }, take: 3 },
      },
      orderBy: { namaUser: 'asc' },
    });
  }

  // ================================================================
  // TETAPKAN / KOSONGKAN JABATAN
  // ================================================================

  /** Kembalikan pemegang lama jadi warga di RT tempat rumahnya berada. */
  private async kembalikanJadiWarga(
    tx: Pick<PrismaService, 'user' | 'rumah'>,
    userId: number,
    warga: { id: number },
    areaCadangan: Area | null,
  ) {
    const rumah = await tx.rumah.findFirst({
      where: { userId, isDelete: false },
      select: { rt: true },
      orderBy: { id: 'asc' },
    });
    await tx.user.update({
      where: { id: userId },
      data: { roleId: warga.id, area: rumah?.rt ?? areaCadangan },
    });
  }

  async assign(actor: AuthUser, dto: AssignPengurusDto) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Peran tidak ditemukan.');
    if (role.level === LEVEL_ADMIN || role.level === LEVEL_WARGA) {
      throw new BadRequestException('Peran ini bukan jabatan pengurus.');
    }
    if (!areaUntukLevel(role.level).includes(dto.area)) {
      throw new BadRequestException(
        `${role.nama} hanya valid untuk ${role.level === 1 ? 'RW' : 'RT 1-4'}.`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('Warga tidak ditemukan.');
    if (user.role.level !== LEVEL_WARGA) {
      throw new BadRequestException(
        `${user.namaUser} sudah menjabat sebagai ${user.role.nama}. Kosongkan jabatannya dulu.`,
      );
    }
    // Pengurus RT harus warga RT itu sendiri.
    if (role.level === 2 && user.area !== dto.area) {
      throw new BadRequestException(`${user.namaUser} bukan warga ${label(dto.area)}.`);
    }

    const warga = await this.roleWarga();
    const lama = await this.prisma.user.findFirst({
      where: { roleId: role.id, area: dto.area },
      select: { id: true, namaUser: true },
    });

    await this.prisma.$transaction(async (tx) => {
      // Satu jabatan satu orang per area: pemegang lama otomatis kembali jadi warga.
      if (lama) await this.kembalikanJadiWarga(tx, lama.id, warga, dto.area);
      await tx.user.update({
        where: { id: user.id },
        data: { roleId: role.id, area: dto.area },
      });
    });

    await this.audit.catat(actor.sub, 'pengurus.tetapkan', {
      target: 'User',
      targetId: user.id,
      keterangan: `${user.namaUser} -> ${role.nama} ${label(dto.area)}${lama ? ` (menggantikan ${lama.namaUser})` : ''}`,
    });

    return {
      message: `${user.namaUser} kini menjabat ${role.nama} ${label(dto.area)}.${lama ? ` ${lama.namaUser} kembali menjadi warga.` : ''}`,
    };
  }

  async vacate(actor: AuthUser, dto: VacatePengurusDto) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Peran tidak ditemukan.');

    const pemegang = await this.prisma.user.findFirst({
      where: { roleId: role.id, area: dto.area },
      select: { id: true, namaUser: true },
    });
    if (!pemegang) throw new BadRequestException('Jabatan ini memang belum ada pemegangnya.');

    const warga = await this.roleWarga();
    await this.prisma.$transaction((tx) =>
      this.kembalikanJadiWarga(tx, pemegang.id, warga, dto.area === 'RW' ? null : dto.area),
    );

    await this.audit.catat(actor.sub, 'pengurus.kosongkan', {
      target: 'User',
      targetId: pemegang.id,
      keterangan: `${pemegang.namaUser} dilepas dari ${role.nama} ${label(dto.area)}`,
    });
    return { message: `${pemegang.namaUser} dilepas dari jabatan ${role.nama} ${label(dto.area)}.` };
  }
}
