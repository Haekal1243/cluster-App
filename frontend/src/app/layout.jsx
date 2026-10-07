import "./globals.css";

export const metadata = {
  title: "Cluster Topaz App",
  description: "Aplikasi warga cluster berbasis Next.js",
  manifest: "/manifest.json",
  icons: {
    icon: "/LogoTopaz.svg",
    shortcut: "/LogoTopaz.svg",
    apple: "/icons/icon-192.png",
  },
};

// maximumScale 1 + userScalable false mematikan pinch-zoom/double-tap-zoom di seluruh
// halaman supaya app terasa seperti app native, bukan tab browser. Zoom foto bukti
// pembayaran tetap jalan karena pakai touch-action: pinch-zoom per-elemen (lihat
// .protected-lightbox-overlay.is-fullscreen di globals.css), yang didukung browser
// modern meski viewport-nya sendiri mengunci skala.
export const viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}


