import "./globals.css";
import { Syne, Plus_Jakarta_Sans } from "next/font/google";

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-syne",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

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
    <html lang="id" suppressHydrationWarning className={`${syne.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}


