import { useEffect, useState } from "react";
import { supabase, type Lead } from "@/lib/supabase";
import AddLeadForm from "@/components/AddLeadForm";
import MissingDataModal from "@/components/MissingDataModal";
import Modal from "@/components/Modal";
import { checkFields, createCustomer, updateLeadStatus } from "@/lib/customerService";

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Lost"];
const SOURCE_OPTIONS = ["Walk-in", "Referral", "Online", "Phone", "Other"];

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

type LeadForm = {
  name: string; phone: string; village: string; district: string;
  source: string; status: string; assigned_to: string; follow_up_date: string;
};

type Props = {
  onSuccess?: (msg: string) => void;
};

export default function LeadsPage({ onSuccess }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);

  // Edit lead
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<LeadForm>({ name: "", phone: "", village: "", district: "", source: "", status: "New", assigned_to: "", follow_up_date: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Missing data modal (lead → customer)
  const [pendingLead, setPendingLead] = useState<Lead | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Search
  const [search, setSearch] = useState("");

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setLeads(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Status change with Qualified conversion logic
  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    if (newStatus === lead.status) return;

    if (newStatus === "Qualified") {
      const check = checkFields(lead);
      if (check.ready) {
        const result = await createCustomer({ name: lead.name!, phone: lead.phone!, village: lead.village! });
        if (result.error) { setError(result.error); return; }
        const { error: statusErr } = await updateLeadStatus(lead.id, "Qualified");
        if (statusErr) { setError(statusErr); return; }
        await fetchLeads();
        showSuccess(result.reason ? `Lead qualified. Note: ${result.reason}` : "Customer created successfully!");
      } else {
        setPendingLead(lead);
        setMissingFields(check.missing);
      }
      return;
    }

    const { error: statusErr } = await updateLeadStatus(lead.id, newStatus);
    if (statusErr) { setError(statusErr); return; }
    await fetchLeads();
  };

  // Edit lead
  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    setEditError(null);
    setEditForm({
      name: lead.name ?? "", phone: lead.phone ?? "", village: lead.village ?? "",
      district: lead.district ?? "", source: lead.source ?? "", status: lead.status ?? "New",
      assigned_to: lead.assigned_to ?? "", follow_up_date: lead.follow_up_date ?? "",
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead) return;
    setEditError(null);
    setEditLoading(true);

    const payload: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(editForm)) {
      payload[k] = v.trim() !== "" ? v.trim() : null;
    }

    const { error } = await supabase.from("leads").update(payload).eq("id", editLead.id);
    if (error) { setEditError(error.message); setEditLoading(false); return; }

    setEditLead(null);
    await fetchLeads();
    showSuccess("Lead updated successfully!");
    setEditLoading(false);
  };

  const statusColor = (s?: string) => {
    switch (s?.toLowerCase()) {
      case "new": return "bg-blue-50 text-blue-700 border-blue-100";
      case "contacted": return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "qualified": return "bg-green-50 text-green-700 border-green-100";
      case "lost": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    return (
      (l.name ?? "").toLowerCase().includes(q) ||
      (l.phone ?? "").includes(q) ||
      (l.village ?? "").toLowerCase().includes(q) ||
      (l.district ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      {/* Success toast */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} total leads</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Lead
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, village or district…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
          />
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddForm && (
        <Modal title="New Lead" onClose={() => setShowAddForm(false)}>
          <AddLeadForm onSuccess={() => { setShowAddForm(false); fetchLeads(); }} onCancel={() => setShowAddForm(false)} />
        </Modal>
      )}

      {/* Edit Lead Modal */}
      {editLead && (
        <Modal title="Edit Lead" onClose={() => setEditLead(null)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Full name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone number" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Village</label>
                <input type="text" value={editForm.village} onChange={(e) => setEditForm((p) => ({ ...p, village: e.target.value }))} placeholder="Village" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>District</label>
                <input type="text" value={editForm.district} onChange={(e) => setEditForm((p) => ({ ...p, district: e.target.value }))} placeholder="District" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Source</label>
                <select value={editForm.source} onChange={(e) => setEditForm((p) => ({ ...p, source: e.target.value }))} className={inputCls}>
                  <option value="">Select source</option>
                  {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))} className={inputCls}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Assigned To</label>
                <input type="text" value={editForm.assigned_to} onChange={(e) => setEditForm((p) => ({ ...p, assigned_to: e.target.value }))} placeholder="Assignee name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Follow-up Date</label>
                <input type="date" value={editForm.follow_up_date} onChange={(e) => setEditForm((p) => ({ ...p, follow_up_date: e.target.value }))} className={inputCls} />
              </div>
            </div>
            {editError && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{editError}</div>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditLead(null)} className="flex-1 py-2 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" disabled={editLoading} className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                {editLoading ? "Saving…" : "Update Lead"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Missing Data Modal */}
      {pendingLead && (
        <MissingDataModal
          lead={pendingLead}
          missingFields={missingFields}
          onSuccess={async (msg) => { setPendingLead(null); setMissingFields([]); await fetchLeads(); showSuccess(msg); }}
          onCancel={() => { setPendingLead(null); setMissingFields([]); }}
        />
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading leads…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">{search ? "No leads match your search." : "No leads yet. Add your first one!"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                  {["Name", "Phone", "Village", "District", "Source", "Status", "Assigned To", "Follow-up", ""].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3.5 font-medium text-gray-900">{lead.name ?? "—"}</td>
                    <td className="px-4 py-3.5 text-gray-600">{lead.phone ?? "—"}</td>
                    <td className="px-4 py-3.5 text-gray-500">{lead.village ?? "—"}</td>
                    <td className="px-4 py-3.5 text-gray-500">{lead.district ?? "—"}</td>
                    <td className="px-4 py-3.5 text-gray-500">{lead.source ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <select
                        value={lead.status ?? "New"}
                        onChange={(e) => handleStatusChange(lead, e.target.value)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 transition ${statusColor(lead.status)}`}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{lead.assigned_to ?? "—"}</td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs">
                      {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => openEdit(lead)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
