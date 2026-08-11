import type { Metadata } from "next";
import "@/styles/globals.css";
import ThemeDynamicInjector from "@/components/layout/ThemeDynamicInjector";

export const metadata: Metadata = {
  title: "DEAControl | DLA Redes y Seguridad",
  description: "ERP Enterprise - Control de Acceso, Geolocalización y Gestión de Personal",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = "dark";
                const stored = localStorage.getItem("dla-ui-storage");
                if (stored) {
                  const state = JSON.parse(stored).state;
                  if (state && state.theme) theme = state.theme;
                }
                if (theme === "system") {
                  theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
                }
                if (theme === "dark") document.documentElement.classList.add("dark");
                else document.documentElement.classList.remove("dark");
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ThemeDynamicInjector />
        {children}
      </body>
    </html>
  );
}
