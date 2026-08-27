import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { useSelectedProperty } from "@/hooks/useSelectedProperty";
import { trpc } from "@/lib/trpc";
import { Calculator, CalendarDays, Landmark, LayoutDashboard, LogOut, PanelLeft, UserRound } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { PropertySelector } from "./PropertySelector";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão geral", path: "/dashboard" },
  { icon: Landmark, label: "Propriedades", path: "/propriedades" },
  { icon: Calculator, label: "Fluxo de caixa", path: "/fluxo-de-caixa" },
  { icon: UserRound, label: "Meu perfil", path: "/perfil" },
];

const SIDEBAR_WIDTH_KEY = "liga-rural:sidebar-width";
const DEFAULT_WIDTH = 268;
const MIN_WIDTH = 224;
const MAX_WIDTH = 340;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [loading, setLocation, user]);

  if (loading || !user) return <DashboardLayoutSkeleton />;

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { propertyId, setPropertyId } = useSelectedProperty();
  const propertiesQuery = trpc.finance.properties.list.useQuery();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const pathname = location.split("?")[0];
  const activeMenuItem = menuItems.find(item => item.path === pathname);
  const currentDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const nextWidth = event.clientX - sidebarLeft;
      if (nextWidth >= MIN_WIDTH && nextWidth <= MAX_WIDTH) setSidebarWidth(nextWidth);
    };
    const stop = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", stop);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="flex min-h-svh w-full overflow-x-hidden bg-background text-foreground">
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-olive/35 bg-field text-sand">
          <SidebarHeader className="h-24 justify-center border-b border-sand/15 px-4">
            <button
              type="button"
              onClick={() => setLocation("/dashboard")}
              className="flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center border border-sand/30 font-display text-xl font-extrabold text-sand">
                S
              </span>
              <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="block font-display text-2xl font-extrabold leading-none text-sand">SIGAR</span>
                <span className="mt-1.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-sage">Gestão rural</span>
              </span>
            </button>
          </SidebarHeader>

          <SidebarContent className="pt-7">
            <p className="px-5 pb-3 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-sage/70 group-data-[collapsible=icon]:hidden">
              Plataforma
            </p>
            <SidebarMenu className="gap-1 px-3">
              {menuItems.map(item => {
                const isActive = item.path === pathname;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`relative h-12 rounded-none border-l-2 px-3 transition-colors duration-300 ${
                        isActive
                          ? "border-sand bg-sand text-field hover:bg-sand hover:text-field"
                          : "border-transparent text-sand/70 hover:border-olive hover:bg-sand/10 hover:text-sand"
                      }`}
                    >
                      <item.icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                      <span className="font-medium">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-sand/15 p-3">
            <button
              type="button"
              onClick={() => setLocation("/perfil")}
              className="flex w-full items-center gap-3 border-b border-sand/15 px-2 pb-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand"
            >
              <Avatar className="h-9 w-9 shrink-0 border border-sand/25 bg-sand/10">
                <AvatarFallback className="bg-transparent font-display text-sm font-bold text-sand">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-sm font-semibold text-sand">{user?.name || "Utilizador"}</span>
                <span className="mt-0.5 block truncate text-[11px] text-sage">{user?.email || "Conta autenticada"}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mt-3 flex h-10 w-full items-center gap-3 px-2 text-sm font-medium text-sand/70 transition-colors hover:bg-sand/10 hover:text-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand"
            >
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sair</span>
            </button>
          </SidebarFooter>
        </Sidebar>

        <button
          type="button"
          aria-label="Redimensionar menu lateral"
          className="absolute right-0 top-0 z-50 hidden h-full w-1 cursor-col-resize bg-transparent hover:bg-olive/60 md:block"
          onMouseDown={() => setIsResizing(true)}
        />
      </div>

      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-40 flex min-h-18 items-center border-b border-olive/25 bg-background px-4 sm:px-6 lg:px-8">
          <div className="flex w-full items-center gap-4">
            <SidebarTrigger
              data-sidebar="trigger"
              aria-label="Abrir menu"
              className="h-10 w-10 rounded-none border border-olive/35 bg-transparent text-field hover:bg-accent hover:text-field md:hidden"
            >
              <PanelLeft className="h-4 w-4" />
            </SidebarTrigger>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-olive">Área interna</p>
              <p className="mt-1 truncate font-display text-xl font-bold leading-none text-graphite">{activeMenuItem?.label ?? "SIGAR"}</p>
            </div>

            <div className="hidden min-w-[240px] lg:block">
              <PropertySelector
                properties={propertiesQuery.data}
                value={propertyId}
                onChange={setPropertyId}
                disabled={propertiesQuery.isLoading}
              />
            </div>

            <div className="hidden items-center gap-2 border-l border-olive/25 pl-5 text-xs text-graphite/60 sm:flex">
              <CalendarDays className="h-4 w-4 text-olive" strokeWidth={1.6} />
              <span className="whitespace-nowrap capitalize">{currentDate}</span>
            </div>

            <button
              type="button"
              onClick={() => setLocation("/perfil")}
              aria-label="Abrir meu perfil"
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field"
            >
              <Avatar className="h-9 w-9 border border-olive/35 bg-accent">
                <AvatarFallback className="bg-transparent font-display text-sm font-bold text-field">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </header>

        {isMobile ? null : <SidebarTrigger data-sidebar="trigger" className="hidden" />}
        <main key={pathname} className="platform-page-enter mx-auto w-full max-w-[1560px] flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
          {children}
        </main>
      </SidebarInset>
    </div>
  );
}
