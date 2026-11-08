import "./globals.css";
import PesanValidasi from "@/components/ui/PesanValidasi";
import DialogHost from "@/components/ui/DialogHost";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

const display = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  variable: "--font-display",
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

export const viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${display.variable} ${jakarta.variable}`}>
      <body>
        <PesanValidasi />
        <DialogHost />
        {children}
      </body>
    </html>
  );
}


