import { useState } from "react";
import { createCustomer, updateLeadStatus, type CustomerData } from "@/lib/customerService";
import type { Lead } from "@/lib/supabase";

type Props = {
  lead: Lead;
  missingFields: string[];
  onSuccess: (message: string) => void;
  onCancel: () => void;
};

export default function MissingDataModal({ lead, missingFields, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<CustomerData>({
    name: lead.name ?? "",
    phone: lead.phone ?? "",
    village: lead.village ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: keyof CustomerData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.phone.trim() || !form.village.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    // 1. Create the customer
    const result = await createCustomer(form);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // 2. Update lead status to Qualified
    const { error: statusError } = await updateLeadStatus(lead.id, "Qualified");
    if (statusError) {
      setError(statusError);
      setLoading(false);
      return;
    }

    if (result.reason) {
      // Duplicate customer — still mark lead as Qualified
      onSuccess(`Lead marked as Qualified. Note: ${result.reason}`);
    } else {
      onSuccess("Customer created successfully!");
    }
  };

  const fieldLabel: Record<string, string> = {
    name: "Name",
    phone: "Phone",
    village: "Village",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Complete Lead Info</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          To convert this lead to a customer, please fill in the missing{" "}
          <span className="font-medium text-gray-700">
            {missingFields.map((f) => fieldLabel[f]).join(", ")}
          </span>
          .
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Phone number"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Village */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Village <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.village}
              onChange={(e) => set("village", e.target.value)}
              placeholder="Village"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
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
              {loading ? "Saving…" : "Convert to Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
