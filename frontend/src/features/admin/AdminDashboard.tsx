/**
 * Executive Admin Dashboard on the Ops surface.
 * Displays:
 * 1. KPI Row with tabular figures (MRR, active clients, churn, avg turnaround)
 * 2. Client roster table with derived onboarding stages and quota counters
 * 3. Global dispatch queue and staff capacity breakdown
 * 4. SLA panel where breaches use #E5484D and nothing else on the page does.
 *
 * Colors match the Creo ops paper surface: #FAFAF8 bg, #14171C text,
 * #E4E4DF borders, #23A26D settled, #4C6FFF blue, #F0A202 waiting.
 */

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Film,
  Image,
  Layers,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  TrendingUp,
  UserMinus,
  UserX,
  Users,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  fetchAdminKPIs,
  fetchAdminQueue,
  fetchClientRoster,
  fetchSLABreaches,
  refreshKPIs,
  suspendUser,
} from "../../lib/ops-api";
import type { AdminKPIs, AdminQueueData, ClientRosterItem, SLABreachItem } from "../../types/ops";
import { BacklogCard } from "../../components/admin/DispatchQueueDashboard";

const getTaskUrgency = (
  slaDueAt: string | null | undefined,
  dueDate: string | null | undefined
): "urgent" | "medium" | "normal" => {
  const targetDate = slaDueAt || dueDate;
  if (!targetDate) return "normal";
  const due = new Date(targetDate);
  if (isNaN(due.getTime())) return "normal";
  const diffHours = (due.getTime() - Date.now()) / (1000 * 60 * 60);
  if (diffHours <= 24) return "urgent";
  if (diffHours <= 48) return "medium";
  return "normal";
};

const getTaskDeliveryDate = (
  slaDueAt: string | null | undefined,
  dueDate: string | null | undefined,
  createdAt: string | null | undefined
): string => {
  const targetDate = slaDueAt || dueDate;
  if (targetDate) {
    const due = new Date(targetDate);
    if (!isNaN(due.getTime())) {
      return due.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }
  if (createdAt) {
    const created = new Date(createdAt);
    if (!isNaN(created.getTime())) {
      const est = new Date(created.getTime() + 48 * 60 * 60 * 1000);
      return est.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  }
  return "Immediate Dispatch";
};

const getClientStage = (c: ClientRosterItem) => {
  if (c.onboarding_stage >= 4 && (c.subscription_status === "active" || c.subscription_status === "trialing")) return 4;
  if (c.onboarding_stage === 3 && (c.subscription_status === "active" || c.subscription_status === "trialing")) return 3;
  if (!c.plan_name || c.plan_name === "No Plan" || c.subscription_status !== "active") return 2;
  return Math.max(1, c.onboarding_stage);
};

const STAGE_OPTIONS = [
  { value: "All", label: "All Stages", sublabel: "View all client accounts", dotColor: "bg-slate-400" },
  { value: "Stage 1", label: "Stage 1", sublabel: "Setup Pending", dotColor: "bg-slate-400" },
  { value: "Stage 2", label: "Stage 2", sublabel: "Payment Pending", dotColor: "bg-amber-500" },
  { value: "Stage 3", label: "Stage 3", sublabel: "Strategy Pending", dotColor: "bg-blue-500" },
  { value: "Stage 4", label: "Stage 4", sublabel: "Completed", dotColor: "bg-emerald-500" },
];

export function AdminDashboard({ actorRole = "admin" }: { actorRole?: string }) {
  const [kpis, setKpis] = useState<AdminKPIs | null>(null);
  const [clients, setClients] = useState<ClientRosterItem[]>([]);
  const [queue, setQueue] = useState<AdminQueueData | null>(null);
  const [slas, setSlas] = useState<SLABreachItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"roster" | "queue" | "slas">("roster");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const stageDropdownRef = useRef<HTMLDivElement>(null);
  const [queueFilter, setQueueFilter] = useState<"all" | "urgent" | "medium">("all");
  const [clientToSuspend, setClientToSuspend] = useState<ClientRosterItem | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(event.target as Node)) {
        setStageDropdownOpen(false);
      }
    }
    if (stageDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [stageDropdownOpen]);

  const loadAllData = React.useCallback(async () => {
    try {
      const [kpiRes, clientRes, queueRes, slaRes] = await Promise.all([
        fetchAdminKPIs(undefined, actorRole),
        fetchClientRoster(undefined, actorRole),
        fetchAdminQueue(undefined, actorRole),
        fetchSLABreaches(undefined, actorRole),
      ]);
      setKpis(kpiRes);
      setClients(clientRes);
      setQueue(queueRes);
      setSlas(slaRes);
      setMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load admin data";
      setMessage({ type: "error", text: msg });
    }
  }, [actorRole]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleRefreshKpis = async () => {
    try {
      setRefreshing(true);
      await refreshKPIs(undefined, actorRole);
      const updated = await fetchAdminKPIs(undefined, actorRole);
      setKpis(updated);
      setMessage({
        type: "success",
        text: "Materialized view mv_exec_kpis refreshed concurrently.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh KPIs";
      setMessage({ type: "error", text: msg });
    } finally {
      setRefreshing(false);
    }
  };

  const confirmSuspendUser = async () => {
    if (!clientToSuspend) return;
    try {
      await suspendUser(clientToSuspend.client_id, undefined, actorRole);
      setMessage({
        type: "success",
        text: "User suspended successfully. Live sessions invalidated.",
      });
      await loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to suspend user.";
      setMessage({ type: "error", text: msg });
    } finally {
      setClientToSuspend(null);
    }
  };

  useEffect(() => {
    if (!clientToSuspend) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClientToSuspend(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [clientToSuspend]);

  return (
    <div
      data-surface="ops"
      className="w-full min-h-screen font-sans"
      style={{ background: "#FAFAF8", color: "#14171C" }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold tracking-tight text-[#0D2137]">
              Executive Dashboard
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>
              Last synchronized:{" "}
              {kpis?.refreshed_at
                ? new Date(kpis.refreshed_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })
                : "4:03:48 PM"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefreshKpis}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-300 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh View
          </button>
        </div>
      </div>

      {/* Status banner */}
      {message && (
        <div
          className="mb-6 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2"
          style={{
            background: message.type === "error" ? "#FEE2E2" : "#E6F4EA",
            border: `1px solid ${message.type === "error" ? "#FCA5A5" : "#A8DAB5"}`,
            color: message.type === "error" ? "#E5484D" : "#137333",
          }}
        >
          {message.type === "error" ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="ml-auto underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ── KPI Grid (4 cards) ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
        {/* MRR */}
        <div className="p-5 rounded-2xl bg-white border-2 border-[#1C6C9C] shadow-xs flex flex-col justify-between transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-sky-600 cursor-pointer">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
            <span>Monthly Recurring Revenue</span>
            <div className="size-7 rounded-full bg-[#E8F4FD] text-[#1C6C9C] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0D2137] tabular-nums tracking-tight">
            {kpis ? kpis.mrr_formatted : "₹100,000.00"}
          </div>
          <div className="mt-2 text-xs font-medium text-[#1C6C9C] flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#1C6C9C] inline-block" />
            <span>
              Live Synced:{" "}
              {kpis?.refreshed_at
                ? new Date(kpis.refreshed_at).toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  }) + " IST"
                : "04:04:48 pm IST"}
            </span>
          </div>
        </div>

        {/* Active Clients */}
        <div className="p-5 rounded-2xl bg-white border-2 border-[#1C6C9C] shadow-xs flex flex-col justify-between transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-sky-600 cursor-pointer">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
            <span>Active Retainer Clients</span>
            <div className="size-7 rounded-full bg-[#E8F4FD] text-[#1C6C9C] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0D2137] tabular-nums tracking-tight">
            {kpis ? kpis.active_clients : 2}
          </div>
          <div className="mt-2 text-xs font-medium text-[#1C6C9C] flex items-center gap-1">
            <span>Active & onboarding brand retainers</span>
          </div>
        </div>

        {/* Client Churn Rate */}
        <div className="p-5 rounded-2xl bg-white border-2 border-[#1C6C9C] shadow-xs flex flex-col justify-between transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-sky-600 cursor-pointer">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
            <span>Client Churn (30d)</span>
            <div className="size-7 rounded-full bg-[#E8F4FD] text-[#1C6C9C] flex items-center justify-center">
              <UserX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0D2137] tabular-nums tracking-tight">
            {kpis ? kpis.churned_last_30d : 0}
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500 flex items-center gap-1">
            <span>Trailing 30-day cancellations</span>
          </div>
        </div>

        {/* Avg Turnaround SLA */}
        <div className="p-5 rounded-2xl bg-white border-2 border-[#1C6C9C] shadow-xs flex flex-col justify-between transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-sky-600 cursor-pointer">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
            <span>Avg Turnaround SLA</span>
            <div className="size-7 rounded-full bg-[#E8F4FD] text-[#1C6C9C] flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#0D2137] tabular-nums tracking-tight">
            {kpis ? `${kpis.avg_turnaround_hours}h` : "0h"}
          </div>
          <div className="mt-2 text-xs font-medium text-slate-500 flex items-center gap-1">
            <span>From draft upload to client approval</span>
          </div>
        </div>
      </div>

      {/* ── Section Navigation Tabs & Controls ──────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-slate-100/90 border border-slate-200/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("roster")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "roster"
                ? "bg-white text-[#0D2137] shadow-xs"
                : "text-slate-600 hover:text-[#0D2137]"
            }`}
          >
            Client Roster ({clients.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "queue"
                ? "bg-white text-[#0D2137] shadow-xs"
                : "text-slate-600 hover:text-[#0D2137]"
            }`}
          >
            Dispatch Queue ({queue?.backlog.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("slas")}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "slas"
                ? "bg-white text-[#0D2137] shadow-xs"
                : "text-slate-600 hover:text-[#0D2137]"
            }`}
          >
            <span>SLA Radar</span>
            {slas.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                {slas.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "roster" && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-full border border-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 w-full md:w-48 transition-all"
              />
            </div>
            {/* Curved Stage Filter Dropdown */}
            <div className="relative" ref={stageDropdownRef}>
              <button
                type="button"
                id="stage-filter-button"
                onClick={() => setStageDropdownOpen((prev) => !prev)}
                className={`px-3.5 py-1.5 rounded-full border text-sm transition-all duration-150 flex items-center gap-2 cursor-pointer outline-none ${
                  stageDropdownOpen
                    ? "border-sky-500 ring-2 ring-sky-500/20 bg-white text-[#0D2137] shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/90 shadow-2xs"
                }`}
                aria-haspopup="listbox"
                aria-expanded={stageDropdownOpen}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 inline-block ${
                    STAGE_OPTIONS.find((s) => s.value === stageFilter)?.dotColor || "bg-slate-400"
                  }`}
                />
                <span className="font-medium text-slate-800">
                  {STAGE_OPTIONS.find((s) => s.value === stageFilter)?.label || "All Stages"}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                    stageDropdownOpen ? "rotate-180 text-sky-600" : ""
                  }`}
                />
              </button>

              {stageDropdownOpen && (
                <div
                  className="absolute left-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/10 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5"
                  role="listbox"
                >
                  <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Filter by Stage
                  </div>
                  <div className="space-y-0.5">
                    {STAGE_OPTIONS.map((opt) => {
                      const isSelected = stageFilter === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setStageFilter(opt.value);
                            setStageDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between cursor-pointer transition-colors duration-150 ${
                            isSelected
                              ? "bg-sky-50 text-sky-800 font-semibold"
                              : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                          }`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 inline-block ${opt.dotColor}`} />
                            <div>
                              <div className="font-medium">{opt.label}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {opt.sublabel}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded-full transition-colors cursor-pointer ${
                  viewMode === "grid" ? "bg-white shadow-xs text-[#0D2137]" : "text-slate-500 hover:text-[#0D2137]"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1 rounded-full transition-colors cursor-pointer ${
                  viewMode === "list" ? "bg-white shadow-xs text-[#0D2137]" : "text-slate-500 hover:text-[#0D2137]"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── TAB: CLIENT ROSTER ──────────────────────────────────────────── */}
      {activeTab === "roster" && (() => {
        const filteredClients = clients.filter((c) => {
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
              c.email.toLowerCase().includes(q) ||
              (c.company_name && c.company_name.toLowerCase().includes(q));
            if (!matchesSearch) return false;
          }
          if (stageFilter !== "All") {
            const stageNum = parseInt(stageFilter.replace("Stage ", ""), 10);
            if (getClientStage(c) !== stageNum) return false;
          }
          return true;
        });

        const getUsageText = (c: ClientRosterItem, kind: string, defaultQuota: number) => {
          const item = c.quota_usage?.find(
            (q) => q.kind.toLowerCase() === kind.toLowerCase()
          );
          return item ? `${item.used}/${item.quota}` : `0/${defaultQuota}`;
        };

        if (viewMode === "grid") {
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredClients.map((c) => {
                const planName = c.plan_display_name || c.plan_name || "Brand Accelerator";
                const planStatus = c.subscription_status
                  ? c.subscription_status.charAt(0).toUpperCase() + c.subscription_status.slice(1)
                  : "Active";
                const cStage = getClientStage(c);

                return (
                  <div
                    key={c.client_id}
                    className="p-5 rounded-2xl bg-white border-2 border-[#1C6C9C] shadow-xs flex flex-col justify-between transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-sky-600 cursor-pointer"
                  >
                    <div>
                      {/* Card Header (Flex row, justify-between) */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-lg font-extrabold text-[#0D2137] truncate" title={c.company_name || "Personal Client"}>
                            {c.company_name || "Personal Client"}
                          </div>
                          <div className="text-sm font-normal text-gray-500 truncate" title={c.email}>
                            {c.email}
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 shrink-0 mt-1">
                          ACTIVE
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="space-y-3.5 mt-3.5">
                        {/* Section 1 (Onboarding) */}
                        <div>
                          <div className="text-xs font-bold text-[#0D2137] mb-1.5">Onboarding</div>
                          <div>
                            {cStage === 4 ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                                Stage 4/4 • Completed
                              </span>
                            ) : cStage === 3 ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#DBEAFE] text-[#1E40AF] border border-[#93C5FD]">
                                Stage 3/4 • Strategy Pending
                              </span>
                            ) : cStage === 2 ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#FEF08A]/70 text-[#854D0E] border border-[#FDE047]/70">
                                Stage 2/4 • Payment Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                Stage 1/4 • Setup Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Section 2 (Plan) */}
                        <div>
                          <div className="text-xs font-bold text-[#0D2137] mb-1">Plan</div>
                          <div className="text-xs font-medium text-slate-700">
                            {planName} / {planStatus}
                          </div>
                        </div>

                        {/* Section 3 (Quota Usage) */}
                        <div>
                          <div className="text-xs font-bold text-[#0D2137] mb-1.5">Quota Usage</div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                              <Film className="size-3 text-[#64748B]" />
                              Reel: {getUsageText(c, "reel", 8)}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                              <Layers className="size-3 text-[#64748B]" />
                              Carousel: {getUsageText(c, "carousel", 20)}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                              <Image className="size-3 text-[#64748B]" />
                              Static_post: {getUsageText(c, "static_post", 15)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setClientToSuspend(c); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium text-[#9F3A4B] bg-[#FCE7EA]/50 hover:bg-[#FCE7EA] border border-[#F4B8C1] transition-colors cursor-pointer"
                      >
                        <UserMinus className="size-3.5 text-[#9F3A4B]" />
                        <span>Suspend</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredClients.length === 0 && (
                <div className="col-span-full py-16 text-center text-sm font-medium text-slate-400 bg-white rounded-2xl border border-slate-200/90">
                  No clients found in roster.
                </div>
              )}
            </div>
          );
        }

        // List View: Matches Client Roster dashboard layout exactly
        return (
          <div className="w-full rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            {/* Mobile View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100 p-2">
              {filteredClients.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm font-medium">
                  No clients found matching filter criteria.
                </div>
              ) : (
                filteredClients.map((c) => {
                  const cStage = getClientStage(c);
                  const planName = c.plan_display_name || c.plan_name || "Growth Tier";
                  const status = (c.account_status || c.subscription_status || "active").toLowerCase();
                  return (
                    <div key={c.client_id} className="p-5 space-y-3.5 bg-white rounded-xl my-2 border border-slate-100 shadow-2xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="size-11 rounded-xl bg-gradient-to-br from-blue-50 to-slate-100 border border-blue-100/80 flex items-center justify-center text-base font-bold text-[#2B7BC4] shrink-0 shadow-2xs">
                            {(c.company_name?.[0] || c.email?.[0] || "C").toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-[#0D2137]">
                              {c.company_name || "Personal Client"}
                            </h4>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{c.email}</p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <span className={`size-1.5 rounded-full ${status === "active" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                          {status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm pt-2.5 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-medium">Plan:</span>
                          <span className="font-semibold text-slate-800 capitalize bg-slate-100 px-3 py-1 rounded-lg text-xs border border-slate-200/60">
                            {planName}
                          </span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                          cStage >= 4
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : cStage === 3
                            ? "bg-blue-50 text-[#2B7BC4] border border-blue-200"
                            : cStage === 2
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          <span className={`size-1.5 rounded-full ${
                            cStage >= 4
                              ? "bg-emerald-500"
                              : cStage === 3
                              ? "bg-[#2B7BC4]"
                              : cStage === 2
                              ? "bg-amber-500"
                              : "bg-slate-400"
                          }`} />
                          {cStage >= 4
                            ? "Stage 4 / 4 • Done"
                            : cStage === 3
                            ? "Stage 3 / 4 • Strategy Pending"
                            : cStage === 2
                            ? "Stage 2 / 4 • Payment Pending"
                            : `Stage ${Math.max(1, cStage)} / 4 • Setup Pending`}
                        </span>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setClientToSuspend(c); }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold text-[#9F3A4B] bg-[#FCE7EA]/60 hover:bg-[#FCE7EA] border border-[#F4B8C1] transition-colors cursor-pointer"
                        >
                          <UserMinus className="size-3 text-[#9F3A4B]" />
                          <span>Suspend</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/90 text-[#0D2137] border-b border-slate-200 font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-8 py-4.5">Client / Brand</th>
                    <th className="px-8 py-4.5">Onboarding Stage</th>
                    <th className="px-8 py-4.5">Current Plan</th>
                    <th className="px-8 py-4.5">Account Status</th>
                    <th className="px-8 py-4.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center text-slate-400 text-sm font-medium">
                        No clients found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((c) => {
                      const cStage = getClientStage(c);
                      const planName = c.plan_display_name || c.plan_name || "Growth Tier";
                      const status = (c.account_status || c.subscription_status || "active").toLowerCase();
                      return (
                        <tr key={c.client_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3.5">
                              <div className="size-11 rounded-xl bg-gradient-to-br from-blue-50 to-slate-100 border border-blue-100/80 flex items-center justify-center text-base font-bold text-[#2B7BC4] shrink-0 shadow-2xs">
                                {(c.company_name?.[0] || c.email?.[0] || "C").toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-base text-[#0D2137] leading-snug">
                                  {c.company_name || "Personal Client"}
                                </div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">{c.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                              cStage >= 4
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : cStage === 3
                                ? "bg-blue-50 text-[#2B7BC4] border border-blue-200"
                                : cStage === 2
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}>
                              <span className={`size-2 rounded-full ${
                                cStage >= 4
                                  ? "bg-emerald-500"
                                  : cStage === 3
                                  ? "bg-[#2B7BC4]"
                                  : cStage === 2
                                  ? "bg-amber-500"
                                  : "bg-slate-400"
                              }`} />
                              {cStage >= 4
                                ? "Stage 4 / 4 • Completed"
                                : cStage === 3
                                ? "Stage 3 / 4 • Strategy Pending"
                                : cStage === 2
                                ? "Stage 2 / 4 • Payment Pending"
                                : `Stage ${Math.max(1, cStage)} / 4 • Setup Pending`}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="inline-block px-3 py-1.5 rounded-lg bg-slate-100/90 border border-slate-200/60 font-semibold text-xs text-slate-700 capitalize">
                              {planName}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <span
                              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              <span className={`size-2 rounded-full ${
                                status === "active" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                              }`} />
                              {status}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setClientToSuspend(c); }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#9F3A4B] bg-[#FCE7EA]/60 hover:bg-[#FCE7EA] border border-[#F4B8C1] transition-colors cursor-pointer"
                            >
                              <UserMinus className="size-3.5 text-[#9F3A4B]" />
                              <span>Suspend</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── TAB: DISPATCH QUEUE & CAPACITY ──────────────────────────────── */}
      {activeTab === "queue" && queue && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-stretch">
          {/* ── Backlog Dispatch Queue (Left Column - 50% split, compact equal height) ───────── */}
          <div className="rounded-2xl shadow-xs overflow-hidden bg-white border border-slate-200/90 flex flex-col h-[540px]">
            {/* Header with Heading and Filter Pills */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2.5 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#0D2137]">
                    Backlog Dispatch Queue
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                    {queue.backlog.filter((t) => queueFilter === "all" || getTaskUrgency(t.sla_due_at, t.due_date) === queueFilter).length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pending creative assignments categorized by urgency
                </p>
              </div>

              {/* Urgency Filter Pills near heading */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setQueueFilter("all")}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    queueFilter === "all"
                      ? "bg-white text-[#0D2137] shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter("urgent")}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    queueFilter === "urgent"
                      ? "bg-red-500 text-white shadow-xs"
                      : "text-red-600 hover:bg-red-50"
                  }`}
                >
                  Urgent
                </button>
                <button
                  type="button"
                  onClick={() => setQueueFilter("medium")}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    queueFilter === "medium"
                      ? "bg-blue-500 text-white shadow-xs"
                      : "text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  Medium
                </button>
              </div>
            </div>

            {/* 3 Grids in 1 Line with Original Dataset - Compact scrollable view */}
            <div className="p-4 flex-1 overflow-y-auto">
              {(() => {
                if (queue.backlog.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-slate-500">
                      Queue empty. All tasks assigned!
                    </div>
                  );
                }

                const filteredOriginal = queue.backlog.filter(
                  (t) => queueFilter === "all" || getTaskUrgency(t.sla_due_at, t.due_date) === queueFilter
                );

                if (filteredOriginal.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No backlog tasks match the "{queueFilter}" urgency filter.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {filteredOriginal.map((t) => (
                      <BacklogCard
                        key={t.id}
                        id={t.id}
                        title={t.client_company ? `${t.deliverable_type.toUpperCase()} • ${t.client_company}` : `${t.deliverable_type.toUpperCase()} Deliverable`}
                        clientCompany={t.client_company || t.client_email || "Client Project"}
                        deliverableType={t.deliverable_type}
                        status={getTaskUrgency(t.sla_due_at, t.due_date)}
                        deliveryDate={getTaskDeliveryDate(t.sla_due_at, t.due_date, t.created_at)}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Staff capacity table (Right Column - 50% split, compact equal height) ────────── */}
          <div className="rounded-2xl shadow-xs overflow-hidden bg-white border border-slate-200/90 flex flex-col h-[540px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2.5 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#0D2137]">
                    Staff Creative Capacity & Work-in-Progress
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                    {queue.staff.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Active WIP vs daily capacity with automatic dispatch ranking
                </p>
              </div>
            </div>

            {/* Mobile View for Staff Capacity (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100 flex-1 overflow-y-auto">
              {queue.staff.map((s) => (
                <div key={s.user_id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-[#0D2137]">{s.full_name || s.email.split("@")[0]}</h4>
                      <p className="text-xs text-slate-500 font-mono">{s.email}</p>
                    </div>
                    {s.on_leave_today ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        On Leave
                      </span>
                    ) : s.is_accepting_work ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Available
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        At Capacity
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500 capitalize font-medium">{s.department}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0D2137]">{s.active_wip} / {s.daily_capacity} WIP</span>
                      <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-[#2B7BC4] rounded-full"
                          style={{ width: `${Math.min(100, (s.active_wip / s.daily_capacity) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {s.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {s.skills.map((skill) => (
                        <span key={skill} className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop View for Staff Capacity (>= 768px) - Equal compact height with sticky header */}
            <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/95 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10 backdrop-blur-xs">
                    <th className="py-3 px-5">Staff Member</th>
                    <th className="py-3 px-5">Department & Skills</th>
                    <th className="py-3 px-5">Active WIP / Capacity</th>
                    <th className="py-3 px-5">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queue.staff.map((s) => (
                    <tr key={s.user_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-sm text-[#0D2137]">
                          {s.full_name || s.email.split("@")[0]}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {s.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="capitalize font-semibold text-[#0D2137]">
                          {s.department}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {s.skills.join(", ")}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums font-bold text-[#0D2137]">
                            {s.active_wip}/{s.daily_capacity}
                          </span>
                          <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-[#2B7BC4] rounded-full"
                              style={{
                                width: `${Math.min(100, (s.active_wip / s.daily_capacity) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        {s.on_leave_today ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            On Leave Today
                          </span>
                        ) : s.is_accepting_work ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Available
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            At Capacity
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: SLA BREACHES PANEL ─────────────────────────────────────── */}
      {activeTab === "slas" && (
        <div className="rounded-2xl shadow-xs overflow-hidden bg-white border border-slate-200/90">
          <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2 text-[#0D2137]">
                <ShieldAlert className="size-4 text-rose-600" />
                <span>Open SLA Breaches & Urgent Escalations</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tasks past sla_due_at without completion. Priority escalations.
              </p>
            </div>
            {slas.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200">
                {slas.length} Breaches
              </span>
            )}
          </div>

          {/* Mobile View for SLA Breaches (< 768px) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {slas.map((item) => (
              <div key={item.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#0D2137]">{item.client_company || "Client Task"}</h4>
                    <p className="text-xs text-slate-500 font-mono">#{item.id.slice(0, 8)}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                    {item.deliverable_type}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 capitalize">Status: <strong className="text-[#0D2137]">{item.status}</strong></span>
                  <span className="text-slate-500">Lead: <strong className="text-[#0D2137]">{item.assignee_name || "Unassigned"}</strong></span>
                </div>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 w-full justify-center">
                    <Clock className="size-3.5" />
                    Breached ({item.sla_due_at ? new Date(item.sla_due_at).toLocaleTimeString() : "Overdue"})
                  </span>
                </div>
              </div>
            ))}
            {slas.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                Zero open SLA breaches. All tasks within turnaround limits!
              </div>
            )}
          </div>

          {/* Desktop View for SLA Breaches (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-5">Task ID & Client</th>
                  <th className="py-3 px-5">Deliverable Type</th>
                  <th className="py-3 px-5">Current Pipeline Status</th>
                  <th className="py-3 px-5">SLA Deadline & Breach</th>
                  <th className="py-3 px-5">Assigned Creative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slas.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-sm text-[#0D2137]">
                        {item.client_company || "Client Task"}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        #{item.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="uppercase font-bold tracking-wider text-[10px] text-[#2B7BC4] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {item.deliverable_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="capitalize font-semibold text-[#0D2137]">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <Clock className="w-3.5 h-3.5" />
                        Breached (
                        {item.sla_due_at
                          ? new Date(item.sla_due_at).toLocaleString()
                          : "Unknown"}
                        )
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-[#0D2137]">
                        {item.assignee_name || item.assignee_email || "Unassigned"}
                      </div>
                    </td>
                  </tr>
                ))}
                {slas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                      Zero open SLA breaches. All tasks within turnaround limits!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ── Suspend Confirmation Modal (Rendered to document.body via Portal for viewport-centered popup regardless of scroll depth) ──────────────────────────────────── */}
      {clientToSuspend &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] w-screen h-screen flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setClientToSuspend(null);
            }}
          >
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-center mx-auto my-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">Suspend Client Access</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Are you sure you want to suspend access for{" "}
                <span className="font-semibold text-slate-700">
                  {clientToSuspend.company_name || "this client"}
                </span>{" "}
                ({clientToSuspend.email})? This will restrict their account and pause active deliverables.
              </p>
              <div className="flex justify-center gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setClientToSuspend(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmSuspendUser}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 shadow-sm transition-colors cursor-pointer"
                >
                  Confirm Suspend
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
