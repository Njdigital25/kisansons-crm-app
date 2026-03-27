import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Lost"];
const SOURCE_OPTIONS = ["Walk-in", "Referral", "Online", "Phone", "Other"];

export default function AddLeadForm({ onSuccess, onCancel }: Props) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    village: "",
    district: "",
    source: "",
    status: "New",
    assigned_to: "",
    follow_up_date: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(form)) {
      payload[key] = value.trim() !== "" ? value.trim() : null;
    }

    const { error } = await supabase.from("leads").insert([payload]);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Full name"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="Phone number"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Village & District */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Village</label>
          <input
            type="text"
            value={form.village}
            onChange={(e) => set("village", e.target.value)}
            placeholder="Village"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">District</label>
          <input
            type="text"
            value={form.district}
            onChange={(e) => set("district", e.target.value)}
            placeholder="District"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Source & Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
          <select
            value={form.source}
            onChange={(e) => set("source", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          >
            <option value="">Select source</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assigned To & Follow-up Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
          <input
            type="text"
            value={form.assigned_to}
            onChange={(e) => set("assigned_to", e.target.value)}
            placeholder="Assignee name"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Follow-up Date</label>
          <input
            type="date"
            value={form.follow_up_date}
            onChange={(e) => set("follow_up_date", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
        >
          {loading ? "Saving…" : "Save Lead"}
        </button>
      </div>
    </form>
  );
}
