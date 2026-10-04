import "./globals.css";

export const metadata = {
  title: "Cluster Topaz App",
  description: "Aplikasi warga cluster berbasis Next.js",
  icons: {
    icon: "/LogoTopaz.svg",
    shortcut: "/LogoTopaz.svg",
    apple: "/LogoTopaz.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}


