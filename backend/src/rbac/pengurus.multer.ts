import { buatMulterOptions } from '../common/file/file.multer';

export const pengurusMulterOptions = buatMulterOptions(
  /\.(jpg|jpeg|png)$/i,
  'Tipe file tidak didukung. Gunakan JPG atau PNG.',
  5,
);
