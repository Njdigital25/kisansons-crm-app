import { useEffect, useState } from "react";
import { supabase, type Lead } from "@/lib/supabase";
import AddLeadForm from "@/components/AddLeadForm";

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setLeads(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const statusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "new": return "bg-blue-50 text-blue-700";
      case "contacted": return "bg-yellow-50 text-yellow-700";
      case "qualified": return "bg-green-50 text-green-700";
      case "lost": return "bg-red-50 text-red-700";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-gray-900">CRM</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Page title + Add button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
            <p className="text-sm text-gray-500 mt-0.5">{leads.length} total</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Lead
          </button>
        </div>

        {/* Add Lead Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900">New Lead</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <AddLeadForm
                onSuccess={() => {
                  setShowForm(false);
                  fetchLeads();
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Leads table */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm">Loading leads…</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No leads yet. Add your first one!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-medium text-gray-900">{lead.name}</td>
                    <td className="px-5 py-4 text-gray-600">{lead.email}</td>
                    <td className="px-5 py-4 text-gray-500">{lead.company ?? "—"}</td>
                    <td className="px-5 py-4">
                      {lead.status ? (
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-400">
                      {lead.created_at
                        ? new Date(lead.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
