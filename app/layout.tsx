import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Norauto | Gestão de Não Conformidades",
  description: "POL.QUA-013 — Gestão de Não Conformidades e Ações Corretivas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
