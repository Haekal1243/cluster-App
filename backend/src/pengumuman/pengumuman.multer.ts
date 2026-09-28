import { buatMulterOptions } from '../common/file/file.multer';

export const pengumumanMulterOptions = buatMulterOptions(
  /\.(pdf|jpg|jpeg|png|doc|docx)$/i,
  'Tipe file tidak didukung. Gunakan PDF, DOC, DOCX, JPG, atau PNG.',
  10,
);
