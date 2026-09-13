import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  DollarSign,
  ExternalLink,
  FileStack,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  Puzzle,
  Settings,
  Shield,
  UserCog,
  Users,
  ChevronLeft,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles?: string[];
}

const ALL_NAV_ITEMS: NavItem[] = [
  // Executive Admin
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["admin", "super_admin"] },
  { label: "Clients Roster", href: "/admin/clients", icon: Users, roles: ["admin", "super_admin"] },

  // Team Lead & Member Primary Home
  { label: "Kanban Board", href: "/dashboard", icon: LayoutDashboard, roles: ["team_member", "team_lead", "editor", "designer"] },

  // Operations & Production (Shared)
  { label: "Task Queue", href: "/admin/tasks", icon: CheckSquare, roles: ["admin", "super_admin", "team_lead", "team_member", "editor", "designer"] },
  { label: "Content Calendar", href: "/admin/calendar", icon: CalendarDays, roles: ["admin", "super_admin", "team_lead", "team_member", "editor", "designer"] },
  { label: "Deliverables", href: "/admin/deliverables", icon: FileStack, roles: ["admin", "super_admin", "team_lead", "team_member", "editor", "designer"] },
  { label: "Support Tickets", href: "/admin/support", icon: LifeBuoy, roles: ["admin", "super_admin", "team_lead", "team_member", "editor", "designer"] },
  { label: "Team Management", href: "/admin/teams", icon: UserCog, roles: ["admin", "super_admin", "team_lead"] },
  { label: "Leave Requests", href: "/admin/leave", icon: CalendarCheck, roles: ["admin", "super_admin", "team_lead", "team_member", "editor", "designer"] },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone, roles: ["admin", "super_admin", "team_lead", "team_member", "editor", "designer"] },

  // Executive Management & Specialized Roles
  { label: "Financial Reports", href: "/admin/reports", icon: BarChart3, roles: ["admin", "super_admin", "investor_relations"] },
  { label: "Sales & Deals", href: "/admin/sales", icon: DollarSign, roles: ["admin", "super_admin", "sales"] },
  { label: "Add-ons Catalog", href: "/admin/addons", icon: Puzzle, roles: ["admin", "super_admin"] },
  { label: "SLA Escalations", href: "/admin/escalations", icon: AlertTriangle, roles: ["admin", "super_admin"] },
  { label: "Settings", href: "/admin/settings", icon: Settings, roles: ["admin", "super_admin"] },
  { label: "Kanban Board", href: "/kanban", icon: LayoutDashboard, roles: ["admin", "super_admin"] },
];

export function OpsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userRole = user?.role || "admin";
  const isTeamStaff = userRole === "team_lead" || userRole === "team_member" || userRole === "editor" || userRole === "designer";
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  const isKanban =
    location.pathname === "/dashboard" || location.pathname === "/kanban";

  const isMainOpsPage = [
    "/admin",
    "/admin/",
    "/dashboard",
    "/kanban",
    "/admin/clients",
    "/admin/queue",
    "/admin/tasks",
    "/admin/calendar",
    "/admin/deliverables",
    "/admin/support",
    "/admin/teams",
    "/admin/leave",
    "/admin/announcements",
    "/admin/sla",
    "/admin/kpis",
    "/admin/reports",
    "/admin/kpi",
    "/admin/sales",
    "/admin/addons",
    "/admin/escalations",
    "/admin/settings",
  ].includes(location.pathname);

  const { data: notifData } = useQuery<{ unread_count: number; items: any[] }>({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      return await request<{ unread_count: number; items: any[] }>("/api/v1/notifications");
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const unreadCount = notifData?.unread_count || 0;
  const notifications = notifData?.items || [];

  const handleMarkAllRead = async () => {
    try {
      await request("/api/v1/notifications/mark-all-read", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    } catch {
      // ignore
    }
  };

  const handleItemClick = async (item: any) => {
    if (!item.is_read) {
      try {
        await request(`/api/v1/notifications/${item.id}/read`, { method: "PATCH" });
        queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      } catch {
        // ignore
      }
    }
    if (item.link) {
      setNotificationOpen(false);
      navigate(item.link);
    }
  };

  // Filter navigation items by active user role
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    if (isAdmin) return item.href !== "/dashboard" || item.roles.includes("admin");
    return item.roles.includes(userRole);
  }).map((item) => {
    if (isAdmin && item.href === "/admin/leave") {
      return { ...item, label: "Leave Approvals" };
    }
    return item;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#F9FAFB] text-[#0D2137]">
      {/* Internal Sidebar — fixed height, scrollable nav only */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/10 bg-[#0D2137] text-white shrink-0 h-screen overflow-hidden">
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-white/10">
          <span className="size-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#2B7BC4] to-[#1A5EA8] font-bold text-white shadow-xs text-sm">
            C
          </span>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white">
              Creo
            </span>
            <span className="text-[10px] font-semibold text-[#6BAED6] -mt-0.5 tracking-wider uppercase">
              {isTeamStaff ? "Creative Workspace" : "Admin & Operations"}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0 scrollbar-thin">
          {/* Operations Section */}
          <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#6BAED6]/60">
            {isTeamStaff ? "Production Pipeline" : "Agency Control Panel"}
          </p>

          {visibleNavItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? location.pathname === "/admin" || location.pathname === "/admin/dashboard"
                : location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#2B7BC4] text-white font-semibold shadow-xs"
                    : "text-[#6BAED6] hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {/* For Admins, provide direct link to Creative Kanban */}
          {isAdmin && (
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors mt-2 ${
                isKanban
                  ? "bg-[#2B7BC4] text-white font-semibold shadow-xs"
                  : "text-[#6BAED6] hover:bg-white/10 hover:text-white"
              }`}
            >
              <CheckSquare className="size-4 shrink-0" />
              Kanban Board
            </Link>
          )}

        </nav>

        {/* User Footer */}
        <div className="border-t border-white/10 p-3 shrink-0">
          <div className="px-3 py-2 mb-2 flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-[#2B7BC4]/30 border border-[#2B7BC4]/40 flex items-center justify-center text-xs font-bold text-white">
              {(user?.full_name?.[0] || "A").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name || "Staff Member"}
              </p>
              <p className="text-[10px] text-[#6BAED6] flex items-center gap-1">
                <Shield className="size-2.5" />
                <span className="capitalize">{(user?.role || "Staff").replace("_", " ")}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-[#6BAED6] transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Area — scrolls independently */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Desktop Top Bar */}
        <header className="hidden lg:flex h-14 items-center justify-between border-b border-[#C9DFF0] bg-white px-6 shadow-2xs shrink-0">
          <div className="flex items-center gap-2.5">
            {!isMainOpsPage && (
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 2) {
                    navigate(-1);
                  } else {
                    navigate(isTeamStaff ? "/dashboard" : "/admin");
                  }
                }}
                className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-[#0D2137] hover:bg-slate-100 transition-colors cursor-pointer mr-1"
                title="Go Back"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            {!isTeamStaff ? (
              <span className="font-bold text-xl text-slate-800 tracking-tight">
                ADMIN
              </span>
            ) : (
              <>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Creative Pod
                </span>
                <span className="text-slate-300">/</span>
                <span className="text-sm font-semibold text-[#0D2137] capitalize">
                  {location.pathname.replace("/dashboard/", "").replace("/", " ") || "Dashboard"}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="relative flex size-9 items-center justify-center rounded-lg text-[#0D2137]/70 hover:bg-slate-100 hover:text-[#0D2137] transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="size-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute 1 top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-84 rounded-2xl border border-border bg-white p-4 shadow-xl z-50 text-[#0D2137] space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#2B7BC4]">
                        Task & Roster Alerts
                      </span>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-[#2B7BC4]">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-semibold text-slate-500 hover:text-[#2B7BC4] cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No new notifications.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleItemClick(n)}
                          className={`rounded-xl p-3 text-xs space-y-1 cursor-pointer transition-all border ${
                            !n.is_read
                              ? "bg-[#E8F4FD]/70 border-[#C9DFF0] hover:bg-[#E8F4FD]"
                              : "bg-slate-50/70 border-slate-100 hover:bg-slate-100 text-slate-600"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className={`font-bold truncate ${!n.is_read ? "text-[#0D2137]" : "text-slate-700"}`}>
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="size-2 rounded-full bg-[#2B7BC4] shrink-0" />
                            )}
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                          {n.link && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2B7BC4]">
                              Go to item <ExternalLink className="size-2.5" />
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-200 text-xs">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-700">{user?.full_name || "Team Member"}</span>
            </div>
          </div>
        </header>

        {/* Mobile Top Bar */}
        <header className="lg:hidden flex h-14 items-center justify-between border-b border-[#C9DFF0] bg-white px-4 shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="size-5" />
            </button>
            {!isMainOpsPage && (
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 2) {
                    navigate(-1);
                  } else {
                    navigate(isTeamStaff ? "/dashboard" : "/admin");
                  }
                }}
                className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-[#0D2137] hover:bg-slate-100 transition-colors"
                title="Go Back"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="size-7 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#2B7BC4] to-[#1A5EA8] font-bold text-white shadow-xs text-xs">
                C
              </span>
              <span className="font-bold text-sm text-[#0D2137]">Creo</span>
              <span className="text-[10px] font-semibold text-[#2B7BC4] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 ml-0.5">
                {isTeamStaff ? "Team" : "Admin"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Kanban Shortcut */}
            {!location.pathname.includes("calendar") && (
              <Link
                to="/dashboard"
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  isKanban ? "bg-[#2B7BC4] text-white" : "text-slate-600 bg-slate-100 hover:bg-slate-200"
                }`}
              >
                Kanban
              </Link>
            )}

            {/* Notification Bell (Mobile) */}
            <button
              type="button"
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="relative flex size-8 items-center justify-center rounded-lg text-[#0D2137]/70 hover:bg-slate-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="size-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex size-2 rounded-full bg-red-500" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile Slide-Over Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer Content */}
            <aside className="relative flex flex-col w-72 max-w-[85vw] bg-[#0D2137] text-white h-full shadow-2xl z-10 animate-fade-in">
              {/* Drawer Header */}
              <div className="flex h-16 items-center justify-between px-5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="size-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#2B7BC4] to-[#1A5EA8] font-bold text-white shadow-xs text-sm">
                    C
                  </span>
                  <div className="flex flex-col">
                    <span className="text-base font-bold tracking-tight text-white">Creo</span>
                    <span className="text-[10px] font-semibold text-[#6BAED6] -mt-0.5 tracking-wider uppercase">
                      {isTeamStaff ? "Creative Workspace" : "Admin & Operations"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
                <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#6BAED6]/60">
                  {isTeamStaff ? "Production Pipeline" : "Agency Control Panel"}
                </p>

                {visibleNavItems.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? location.pathname === "/admin" || location.pathname === "/admin/dashboard"
                      : location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-[#2B7BC4] text-white font-semibold shadow-xs"
                          : "text-[#6BAED6] hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}

                {isAdmin && (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors mt-2 ${
                      isKanban
                        ? "bg-[#2B7BC4] text-white font-semibold shadow-xs"
                        : "text-[#6BAED6] hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <CheckSquare className="size-4 shrink-0" />
                    Kanban Board
                  </Link>
                )}

              </nav>

              {/* Drawer User Footer */}
              <div className="border-t border-white/10 p-3 shrink-0">
                <div className="px-3 py-2 mb-2 flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-[#2B7BC4]/30 border border-[#2B7BC4]/40 flex items-center justify-center text-xs font-bold text-white">
                    {(user?.full_name?.[0] || "A").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {user?.full_name || "Staff Member"}
                    </p>
                    <p className="text-[10px] text-[#6BAED6] flex items-center gap-1">
                      <Shield className="size-2.5" />
                      <span className="capitalize">{(user?.role || "Staff").replace("_", " ")}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Content Pane — only this scrolls */}
        <main
          className={`flex-1 min-h-0 ${
            isKanban
              ? "flex flex-col overflow-hidden p-3 sm:p-5 lg:p-6"
              : "overflow-y-auto scrollbar-thin p-4 sm:p-6 lg:p-8 animate-page-in"
          }`}
        >
          <div className={isKanban ? "w-full h-full flex flex-col flex-1 min-h-0" : "max-w-[1600px] w-full mx-auto"}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
