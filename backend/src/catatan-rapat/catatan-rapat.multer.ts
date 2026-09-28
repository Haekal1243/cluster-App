import { buatMulterOptions } from '../common/file/file.multer';

export const catatanRapatMulterOptions = buatMulterOptions(
  /\.(pdf|doc|docx|jpg|jpeg|png)$/i,
  'Tipe file tidak didukung. Gunakan PDF, DOC/DOCX, JPG, atau PNG.',
  10,
);
