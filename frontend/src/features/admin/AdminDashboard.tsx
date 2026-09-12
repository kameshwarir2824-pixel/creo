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
  CheckCircle2,
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
import React, { useState, useEffect } from "react";
import {
  fetchAdminKPIs,
  fetchAdminQueue,
  fetchClientRoster,
  fetchSLABreaches,
  refreshKPIs,
  suspendUser,
} from "../../lib/ops-api";
import type { AdminKPIs, AdminQueueData, ClientRosterItem, SLABreachItem } from "../../types/ops";

const getClientStage = (c: ClientRosterItem) => {
  if (c.onboarding_stage >= 4 && (c.subscription_status === "active" || c.subscription_status === "trialing")) return 4;
  if (c.onboarding_stage === 3 && (c.subscription_status === "active" || c.subscription_status === "trialing")) return 3;
  if (!c.plan_name || c.plan_name === "No Plan" || c.subscription_status !== "active") return 2;
  return Math.max(1, c.onboarding_stage);
};

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
  const [clientToSuspend, setClientToSuspend] = useState<ClientRosterItem | null>(null);

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
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-1.5 rounded-full border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer outline-none"
            >
              <option value="All">All Stages</option>
              <option value="Stage 1">Stage 1</option>
              <option value="Stage 2">Stage 2</option>
              <option value="Stage 3">Stage 3</option>
              <option value="Stage 4">Stage 4</option>
            </select>
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
      {activeTab === "roster" && (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-3 gap-5" : "flex flex-col gap-4"}>
          {clients.filter((c) => {
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
          }).map((c) => {
            const getUsageText = (kind: string, defaultQuota: number) => {
              const item = c.quota_usage?.find(
                (q) => q.kind.toLowerCase() === kind.toLowerCase()
              );
              return item ? `${item.used}/${item.quota}` : `0/${defaultQuota}`;
            };

            const planName = c.plan_display_name || c.plan_name || "Brand Accelerator";
            const planStatus = c.subscription_status
              ? c.subscription_status.charAt(0).toUpperCase() + c.subscription_status.slice(1)
              : "Active";

            const cStage = getClientStage(c);

            return viewMode === "grid" ? (
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
                          Reel: {getUsageText("reel", 8)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                          <Layers className="size-3 text-[#64748B]" />
                          Carousel: {getUsageText("carousel", 20)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                          <Image className="size-3 text-[#64748B]" />
                          Static_post: {getUsageText("static_post", 15)}
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
            ) : (
              <div
                key={c.client_id}
                className="py-3 px-6 rounded-2xl bg-white border-2 border-[#1C6C9C] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-sky-600 cursor-pointer"
              >
                {/* Details Section */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 flex-1 min-w-0">
                  <div className="min-w-0 md:w-64">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-lg font-extrabold text-[#0D2137] truncate" title={c.company_name || "Personal Client"}>
                        {c.company_name || "Personal Client"}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                        ACTIVE
                      </span>
                    </div>
                    <div className="text-sm font-normal text-gray-500 truncate" title={c.email}>
                      {c.email}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="text-xs font-bold text-[#0D2137] mb-1">Onboarding</div>
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

                  <div className="flex-1">
                    <div className="text-xs font-bold text-[#0D2137] mb-1">Plan & Quota</div>
                    <div className="text-xs font-medium text-slate-700 mb-1.5">
                      {planName} / {planStatus}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]" title="Reels">
                        <Film className="size-2.5 text-[#64748B]" /> {getUsageText("reel", 8)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]" title="Carousels">
                        <Layers className="size-2.5 text-[#64748B]" /> {getUsageText("carousel", 20)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end shrink-0">
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
          {clients.length === 0 && (
            <div className="col-span-full py-12 text-center text-xs text-slate-500 bg-white rounded-2xl border-2 border-[#1C6C9C]">
              No clients found in roster.
            </div>
          )}
        </div>
      )}

      {/* ── TAB: DISPATCH QUEUE & CAPACITY ──────────────────────────────── */}
      {activeTab === "queue" && queue && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Backlog items */}
          <div className="lg:col-span-1 rounded-xl shadow-sm p-5" style={{ background: "#FFFFFF", border: "1px solid #E4E4DF" }}>
            <h2 className="text-sm font-bold mb-1" style={{ color: "#14171C" }}>
              Backlog Dispatch Queue
            </h2>
            <p className="text-xs mb-4" style={{ color: "#6B7280" }}>
              Pending creative assignments
            </p>

            <div className="flex flex-col gap-2">
              {queue.backlog.map((t) => (
                <div key={t.id} className="p-3 rounded-lg" style={{ border: "1px solid #E4E4DF", background: "#FAFAF8" }}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold uppercase text-[10px]" style={{ color: "#4C6FFF" }}>
                      {t.deliverable_type}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: "#6B7280" }}>
                      #{t.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="text-xs font-medium" style={{ color: "#14171C" }}>
                    {t.client_company || "Client Task"}
                  </div>
                </div>
              ))}
              {queue.backlog.length === 0 && (
                <div className="py-8 text-center text-xs" style={{ color: "#6B7280" }}>
                  Queue empty. All tasks assigned!
                </div>
              )}
            </div>
          </div>

          {/* Staff capacity table */}
          <div className="lg:col-span-2 rounded-2xl shadow-xs overflow-hidden bg-white border border-slate-200/90">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-[#0D2137]">
                Staff Creative Capacity & Work-in-Progress
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active WIP vs daily capacity with automatic dispatch ranking
              </p>
            </div>

            {/* Mobile View for Staff Capacity (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
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

            {/* Desktop View for Staff Capacity (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
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
      {/* ── Suspend Confirmation Modal ──────────────────────────────────── */}
      {clientToSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md transition-all">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-center mx-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <UserX className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">Suspend Client Access</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to suspend access for <span className="font-semibold text-slate-700">{clientToSuspend.company_name || "this client"}</span> ({clientToSuspend.email})? This will restrict their account and pause active deliverables.
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
        </div>
      )}
    </div>
  );
}
