import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestão de Clientes",
  description: "Gerenciamento de clientes de tráfego pago",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-[#0f0f0f] text-[#f0f0f0]">{children}</body>
    </html>
  );
}
