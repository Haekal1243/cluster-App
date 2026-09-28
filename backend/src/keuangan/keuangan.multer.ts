import { buatMulterOptions } from '../common/file/file.multer';

export const keuanganMulterOptions = buatMulterOptions(
  /\.(jpg|jpeg|png|pdf)$/i,
  'Tipe file tidak didukung. Gunakan JPG, PNG, atau PDF.',
  5,
);
