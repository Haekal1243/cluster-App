import { buatMulterOptions } from '../common/file/file.multer';

export const kegiatanMulterOptions = buatMulterOptions(
  /\.(jpg|jpeg|png)$/i,
  'Tipe file tidak didukung. Gunakan JPG atau PNG.',
  10,
);
