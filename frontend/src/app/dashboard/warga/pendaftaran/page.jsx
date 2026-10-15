import { redirect } from "next/navigation";

// Compat: link notifikasi lama /dashboard/warga/pendaftaran -> lokasi baru Data Warga.
export default function PendaftaranRedirect() {
  redirect("/dashboard/data-warga/pendaftaran");
}
