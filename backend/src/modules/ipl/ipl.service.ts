import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IplService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() { return []; }
  findOne(id: number) { return null; }
  create(data: any) { return null; }
  update(id: number, data: any) { return null; }
  remove(id: number) { return null; }
}
