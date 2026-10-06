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

export const viewport = {
  themeColor: "#0d9488",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}


