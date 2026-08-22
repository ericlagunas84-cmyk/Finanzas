import type { Metadata } from "next";
import "./globals.css";

// Las fuentes y los íconos se cargan UNA VEZ aquí — ningún componente
// individual necesita repetir estos <link>, a diferencia de los mockups
// estáticos de referencia donde cada HTML los traía por separado.

export const metadata: Metadata = {
  title: "Emerald Finance",
  description: "Control de deudas, MSI, recibos y servicios recurrentes para México",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-surface antialiased">{children}</body>
    </html>
  );
}
