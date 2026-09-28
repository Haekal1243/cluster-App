import { buatMulterOptions } from '../common/file/file.multer';

export const setoranMulterOptions = buatMulterOptions(
  /\.(jpg|jpeg|png)$/i,
  'Tipe file tidak didukung. Gunakan JPG atau PNG.',
  5,
);
