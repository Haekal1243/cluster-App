import { buka } from "./dialog";

/** Pesan satu tombol. icon: success | error | warning | info. */
export const showMessage = (title, text, icon = "info") => buka({ tipe: "pesan", title, text, icon });

/** Konfirmasi Ya/Batal. Mengembalikan true bila dikonfirmasi. */
export const showConfirm = (title, text, icon = "question", confirmText = "Ya", cancelText = "Batal") =>
  buka({ tipe: "konfirmasi", title, text, icon, confirmText, cancelText });

/** Isian teks (mis. alasan). Mengembalikan teks, atau undefined bila dibatalkan. */
export const showPrompt = ({
  title,
  text,
  label,
  placeholder,
  confirmText = "Kirim",
  cancelText = "Batal",
  wajib = true,
  pesanWajib = "Wajib diisi",
}) => buka({ tipe: "prompt", title, text, label, placeholder, confirmText, cancelText, wajib, pesanWajib });

/** Pilih satu opsi. options: [{ value, label }]. Mengembalikan value, atau undefined bila dibatalkan. */
export const showPilihan = ({ title, text, label, options, value, confirmText = "Ya", cancelText = "Batal" }) =>
  buka({ tipe: "pilihan", title, text, label, options, value: value ?? options?.[0]?.value, confirmText, cancelText });

/** Tampilkan kredensial sementara (username + password) supaya pengurus bisa menyampaikannya ke warga. */
export const showCredentials = (opsi) => buka({ tipe: "kredensial", icon: "success", ...opsi });
