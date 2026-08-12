"use client";
import React from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Menu, Moon, Sun, LogOut, User, Settings, Smartphone, Monitor } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar, theme, toggleTheme } = useUIStore();

  const isSuperAdmin = Boolean(user?.is_superuser) || 
    (typeof user?.role === "string" && user.role.toLowerCase().includes("super")) || 
    (typeof user?.role === "object" && user.role?.name?.toLowerCase().includes("super"));

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-sm font-medium">Panel de Control</p>
          <p className="text-xs text-muted-foreground">DEAControl ERP</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isSuperAdmin && (
          <Link href="/mobile">
            <Button size="sm" className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-semibold shadow-md border-0 transition-all hover:scale-105 rounded-xl">
              <Smartphone className="h-4 w-4" />
              <span>Acceso App Móvil</span>
              <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-mono">Admin</span>
            </Button>
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "light" ? <Sun className="h-4 w-4 text-amber-500" /> : theme === "dark" ? <Moon className="h-4 w-4 text-cyan-400" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {user?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.full_name || "Usuario"}</p>
                <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem><User className="mr-2 h-4 w-4" />Mi Perfil</DropdownMenuItem>
            <DropdownMenuItem><Settings className="mr-2 h-4 w-4" />Configuración</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
