import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

const STATUS_OPTIONS = ["new", "contacted", "qualified", "lost"];

export default function AddLeadForm({ onSuccess, onCancel }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("new");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.from("leads").insert([
      { name, email, company: company || null, status },
    ]);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="lead-name">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="lead-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="lead-email">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="lead-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@company.com"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="lead-company">
          Company
        </label>
        <input
          id="lead-company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Acme Corp"
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="lead-status">
          Status
        </label>
        <select
          id="lead-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
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
