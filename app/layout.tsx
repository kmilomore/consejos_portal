import type { Metadata } from "next";
import localFont from "next/font/local";
import { PortalAuthProvider } from "@/lib/supabase/auth-context";
import { AppFrame } from "@/components/portal/app-frame";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const museoSans = localFont({
  src: [
    {
      path: "../public/MuseoSans-100.woff",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/MuseoSans-500.woff",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/MuseoSans-700.woff",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/MuseoSans-900.woff",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-museo-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portal Consejos Escolares",
  description: "Programación, actas y métricas para consejos escolares del SLEP.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={museoSans.variable}>
        <PortalAuthProvider>
          <AppFrame>{children}</AppFrame>
          <Toaster />
        </PortalAuthProvider>
      </body>
    </html>
  );
}