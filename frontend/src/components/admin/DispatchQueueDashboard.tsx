import { useState } from "react";
import { AlertCircle, Clock } from "lucide-react";

import {
  type BacklogItem,
  type BacklogStatus,
  MOCK_BACKLOG_ITEMS,
  MOCK_STAFF_MEMBERS,
  type StaffMember,
} from "./dispatch-types";

export interface BacklogCardProps {
  id: string;
  title: string;
  clientCompany: string;
  deliverableType: string;
  status: BacklogStatus;
  deliveryDate: string;
  onAssign?: (id: string) => void;
}

/**
 * Reusable Backlog Card Component with strict conditional Tailwind styling
 */
export function BacklogCard({
  id,
  title,
  clientCompany,
  deliverableType,
  status,
  deliveryDate,
  onAssign,
}: BacklogCardProps) {
  // Conditional container border & outline styling based on status
  const getContainerStyles = () => {
    switch (status) {
      case "urgent":
        return "bg-white border-2 border-red-500 shadow-sm";
      case "medium":
        return "bg-white border-2 border-blue-500 shadow-sm";
      case "normal":
      default:
        return "bg-white border border-gray-200 shadow-xs";
    }
  };

  return (
    <div
      className={`rounded-xl p-3 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md min-h-[160px] ${getContainerStyles()}`}
    >
      <div>
        {/* Top bar: Deliverable tag */}
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            {deliverableType}
          </span>
        </div>

        {/* Status Callout Banner: Specific required text & styling */}
        {status === "urgent" && (
          <div className="mb-1.5 flex items-center gap-1 text-[11px] font-bold text-red-600 tracking-tight">
            <AlertCircle className="w-3 h-3 text-red-600 shrink-0 animate-pulse" />
            <span>URGENT ( &lt; 24h )</span>
          </div>
        )}

        {status === "medium" && (
          <div className="mb-1.5 flex items-center gap-1 text-[11px] font-bold text-blue-600 tracking-tight">
            <Clock className="w-3 h-3 text-blue-600 shrink-0" />
            <span>MEDIUM ( &lt; 48h )</span>
          </div>
        )}

        {/* Task Details */}
        <h4 className="font-bold text-xs text-[#0D2137] line-clamp-2 leading-snug">
          {title}
        </h4>
        <p className="text-[10px] text-gray-500 mt-0.5 font-medium truncate">
          {clientCompany}
        </p>
      </div>

      {/* Card Bottom: DATE TO DELIVER footer line */}
      <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-col gap-1.5">
        <div className="text-[10px] text-gray-600 font-medium flex flex-col gap-0.5">
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">DATE TO DELIVER:</span>
          <span className="font-semibold text-[#0D2137] text-[11px] truncate">{deliveryDate}</span>
        </div>

        {onAssign && (
          <button
            type="button"
            onClick={() => onAssign(id)}
            className="w-full py-1 px-2 rounded-lg bg-slate-50 hover:bg-[#0D2137] hover:text-white border border-slate-200 text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Dispatch
          </button>
        )}
      </div>
    </div>
  );
}

interface DispatchQueueDashboardProps {
  backlogItems?: BacklogItem[];
  staffMembers?: StaffMember[];
  onAssignTask?: (taskId: string) => void;
}

/**
 * Strict 50/50 Split Screen Layout Admin Dashboard Component
 * Left: Multi-column Backlog Dispatch Queue (grid-cols-3)
 * Right: Staff Creative Capacity & WIP Table
 */
export function DispatchQueueDashboard({
  backlogItems = MOCK_BACKLOG_ITEMS,
  staffMembers = MOCK_STAFF_MEMBERS,
  onAssignTask,
}: DispatchQueueDashboardProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | BacklogStatus>("all");

  const filteredItems = backlogItems.filter(
    (item) => filterStatus === "all" || item.status === filterStatus
  );

  return (
    <div className="w-full">
      {/* ── 1. Main Layout Structure: Strict 50/50 Split Screen Layout ────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-stretch">
        
        {/* ── 2. Left Column (50% width): Backlog Dispatch Queue ─────────── */}
        <div className="w-full rounded-2xl shadow-xs overflow-hidden bg-white border border-slate-200/90 flex flex-col h-[540px]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2.5 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#0D2137]">
                  Backlog Dispatch Queue
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                  {filteredItems.length}
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
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === "all"
                    ? "bg-white text-[#0D2137] shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("urgent")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === "urgent"
                    ? "bg-red-500 text-white shadow-xs"
                    : "text-red-600 hover:bg-red-50"
                }`}
              >
                Urgent
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("medium")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  filterStatus === "medium"
                    ? "bg-blue-500 text-white shadow-xs"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                Medium
              </button>
            </div>
          </div>

          {/* Multi-column Small Grid for Backlog Items (3 grids in 1 line) */}
          <div className="p-4 flex-1 overflow-y-auto">
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {filteredItems.map((item) => (
                  <BacklogCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    clientCompany={item.clientCompany}
                    deliverableType={item.deliverableType}
                    status={item.status}
                    deliveryDate={item.deliveryDate}
                    onAssign={onAssignTask}
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400">
                No backlog tasks match the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Right Column (50% width): Staff Creative Capacity & WIP ─── */}
        <div className="w-full rounded-2xl shadow-xs overflow-hidden bg-white border border-slate-200/90 flex flex-col h-[540px]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <h2 className="text-sm font-bold text-[#0D2137]">
              Staff Creative Capacity & Work-in-Progress
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active WIP vs daily capacity with automatic dispatch ranking
            </p>
          </div>

          {/* Table Container matching the 50% width and exact height */}
          <div className="flex-1 overflow-y-auto">
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-xs">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Department & Skills</th>
                    <th className="py-3 px-4">WIP / Capacity</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffMembers.map((s) => {
                    const loadPercentage = Math.min(
                      100,
                      (s.activeWip / (s.dailyCapacity || 1)) * 100
                    );

                    return (
                      <tr key={s.userId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-sm text-[#0D2137]">
                            {s.fullName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {s.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-semibold text-[#0D2137]">
                            {s.department}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.skills.slice(0, 2).map((skill) => (
                              <span
                                key={skill}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                            {s.skills.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                +{s.skills.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono tabular-nums font-bold text-[#0D2137]">
                              {s.activeWip}/{s.dailyCapacity}
                            </span>
                            <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  loadPercentage >= 100
                                    ? "bg-rose-500"
                                    : loadPercentage >= 75
                                    ? "bg-amber-500"
                                    : "bg-[#2B7BC4]"
                                }`}
                                style={{ width: `${loadPercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {s.onLeaveToday ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              On Leave
                            </span>
                          ) : s.isAcceptingWork ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Available
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              At Capacity
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {staffMembers.map((s) => (
                <div key={s.userId} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-[#0D2137]">{s.fullName}</h4>
                      <p className="text-xs text-slate-500 font-mono">{s.email}</p>
                    </div>
                    {s.onLeaveToday ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        On Leave
                      </span>
                    ) : s.isAcceptingWork ? (
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
                    <span className="text-slate-500 capitalize">{s.department}</span>
                    <span className="font-mono font-bold text-[#0D2137]">
                      {s.activeWip} / {s.dailyCapacity} WIP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default DispatchQueueDashboard;
