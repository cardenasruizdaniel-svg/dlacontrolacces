"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginPage from "./login/page";

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    const isMobile = window.innerWidth < 768 || window.matchMedia("(display-mode: standalone)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (token) {
      setIsAuthenticated(true);
      // Let the dashboard layout handle platform access rules
      router.push("/dashboard");
    } else {
      if (isMobile) {
        // Direct mobile login redirection to /mobile route
        router.push("/mobile");
      } else {
        setIsAuthenticated(false);
      }
    }
  }, [router]);

  if (isAuthenticated === true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-pulse text-lg font-medium">Redirigiendo a DLA Access Enterprise Dashboard...</div>
      </div>
    );
  }

  return <LoginPage />;
}
