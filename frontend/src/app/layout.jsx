import "./globals.css";

export const metadata = {
  title: "Cluster App",
  description: "Aplikasi warga cluster berbasis Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}


