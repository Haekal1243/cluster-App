import { Controller, Get, Global, Module, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../auth/public.decorator';
import { FileService } from './file.service';

/** Ambil file publik (foto pengurus, gambar kegiatan, lampiran pengumuman, foto pengaduan). */
@Controller('files')
export class FileController {
  constructor(private readonly files: FileService) {}

  @Public()
  @Get(':id')
  ambil(@Param('id') id: string, @Res() res: Response) {
    return this.files.kirim(res, id, { publikSaja: true });
  }
}

@Global()
@Module({
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
