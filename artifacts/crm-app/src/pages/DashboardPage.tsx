import { useEffect, useState } from "react";
import { supabase, type Lead, type Customer } from "@/lib/supabase";

type Stats = {
  totalLeads: number;
  totalCustomers: number;
  qualifiedLeads: number;
  conversionRate: number;
  newLeads: number;
  contactedLeads: number;
  lostLeads: number;
  followUpsToday: number;
};

const StatCard = ({
  label, value, sub, color, icon,
}: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [{ data: leads }, { data: customers }] = await Promise.all([
        supabase.from("leads").select("*"),
        supabase.from("customers").select("id"),
      ]);

      const l = leads ?? [];
      const c = customers ?? [];

      const qualified = l.filter((x: Lead) => x.status === "Qualified").length;
      const total = l.length;

      setStats({
        totalLeads: total,
        totalCustomers: c.length,
        qualifiedLeads: qualified,
        conversionRate: total > 0 ? Math.round((c.length / total) * 100) : 0,
        newLeads: l.filter((x: Lead) => x.status === "New").length,
        contactedLeads: l.filter((x: Lead) => x.status === "Contacted").length,
        lostLeads: l.filter((x: Lead) => x.status === "Lost").length,
        followUpsToday: l.filter((x: Lead) => x.follow_up_date === today).length,
      });

      setRecentLeads(l.sort((a: Lead, b: Lead) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      ).slice(0, 5));

      setUpcomingFollowUps(
        l.filter((x: Lead) => x.follow_up_date && x.follow_up_date >= today)
          .sort((a: Lead, b: Lead) => (a.follow_up_date ?? "").localeCompare(b.follow_up_date ?? ""))
          .slice(0, 5)
      );

      setLoading(false);
    };
    load();
  }, []);

  const statusColor = (s?: string) => {
    switch (s?.toLowerCase()) {
      case "new": return "bg-blue-50 text-blue-700";
      case "contacted": return "bg-yellow-50 text-yellow-700";
      case "qualified": return "bg-green-50 text-green-700";
      case "lost": return "bg-red-50 text-red-700";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-400">Loading dashboard…</div>;
  }

  const s = stats!;
  const statusBreakdown = [
    { label: "New", value: s.newLeads, color: "bg-blue-500" },
    { label: "Contacted", value: s.contactedLeads, color: "bg-yellow-500" },
    { label: "Qualified", value: s.qualifiedLeads, color: "bg-green-500" },
    { label: "Lost", value: s.lostLeads, color: "bg-red-400" },
  ];

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back — here's your pipeline at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Leads"
          value={s.totalLeads}
          sub="All time"
          color="bg-indigo-50"
          icon={<svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          label="Customers"
          value={s.totalCustomers}
          sub="Converted leads"
          color="bg-green-50"
          icon={<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="Conversion Rate"
          value={`${s.conversionRate}%`}
          sub="Leads → Customers"
          color="bg-purple-50"
          icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
        <StatCard
          label="Follow-ups Today"
          value={s.followUpsToday}
          sub="Scheduled today"
          color="bg-orange-50"
          icon={<svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Lead Status Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Lead Pipeline</h3>
          <div className="space-y-3">
            {statusBreakdown.map(({ label, value, color }) => {
              const pct = s.totalLeads > 0 ? Math.round((value / s.totalLeads) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{label}</span>
                    <span className="text-gray-400">{value} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100">
                    <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Follow-ups */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Upcoming Follow-ups</h3>
          {upcomingFollowUps.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No follow-ups scheduled</p>
          ) : (
            <div className="space-y-2">
              {upcomingFollowUps.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{lead.name ?? "Unnamed"}</p>
                    <p className="text-xs text-gray-400">{lead.phone ?? "—"} · {lead.village ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(lead.status)}`}>
                      {lead.status ?? "—"}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Leads</h3>
        {recentLeads.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No leads yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  {["Name", "Phone", "Village", "Source", "Status", "Added"].map((h) => (
                    <th key={h} className="pb-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{lead.name ?? "—"}</td>
                    <td className="py-3 pr-4 text-gray-500">{lead.phone ?? "—"}</td>
                    <td className="py-3 pr-4 text-gray-500">{lead.village ?? "—"}</td>
                    <td className="py-3 pr-4 text-gray-500">{lead.source ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColor(lead.status)}`}>
                        {lead.status ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 text-xs">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
