import { redirect } from "next/navigation";

// Compat: link notifikasi lama /dashboard/warga/blok-rumah -> lokasi baru Data Warga.
export default function BlokRumahRedirect() {
  redirect("/dashboard/data-warga/blok-rumah");
}
