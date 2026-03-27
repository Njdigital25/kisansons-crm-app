import { useEffect, useState } from "react";
import { supabase, type Customer } from "@/lib/supabase";
import Modal from "@/components/Modal";

type CustomerForm = {
  name: string;
  phone: string;
  village: string;
};

const emptyForm: CustomerForm = { name: "", phone: "", village: "" };

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

function CustomerFormFields({
  form,
  onChange,
}: {
  form: CustomerForm;
  onChange: (field: keyof CustomerForm, val: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Name</label>
        <input type="text" value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="Full name" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Phone</label>
        <input type="tel" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="Phone number" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Village</label>
        <input type="text" value={form.village} onChange={(e) => onChange("village", e.target.value)} placeholder="Village" className={inputCls} />
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<CustomerForm>(emptyForm);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<CustomerForm>(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setCustomers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Add
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);

    const payload = {
      name: addForm.name.trim() || null,
      phone: addForm.phone.trim() || null,
      village: addForm.village.trim() || null,
    };

    if (payload.phone) {
      const { data: dup } = await supabase.from("customers").select("id").eq("phone", payload.phone).maybeSingle();
      if (dup) { setAddError("A customer with this phone already exists."); setAddLoading(false); return; }
    }

    const { error } = await supabase.from("customers").insert([payload]);
    if (error) { setAddError(error.message); setAddLoading(false); return; }

    setShowAdd(false);
    setAddForm(emptyForm);
    await fetchCustomers();
    showSuccess("Customer added successfully!");
    setAddLoading(false);
  };

  // Edit
  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setEditForm({ name: c.name ?? "", phone: c.phone ?? "", village: c.village ?? "" });
    setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomer) return;
    setEditError(null);
    setEditLoading(true);

    const payload = {
      name: editForm.name.trim() || null,
      phone: editForm.phone.trim() || null,
      village: editForm.village.trim() || null,
    };

    const { error } = await supabase.from("customers").update(payload).eq("id", editCustomer.id);
    if (error) { setEditError(error.message); setEditLoading(false); return; }

    setEditCustomer(null);
    await fetchCustomers();
    showSuccess("Customer updated successfully!");
    setEditLoading(false);
  };

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q) ||
      (c.village ?? "").toLowerCase().includes(q)
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
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length} total customers</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(null); setAddForm(emptyForm); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or village…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading customers…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">{search ? "No customers match your search." : "No customers yet."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                {["Name", "Phone", "Village", "Added", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/70 transition">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{c.name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-gray-600">{c.phone ?? "—"}</td>
                  <td className="px-5 py-3.5 text-gray-500">{c.village ?? "—"}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => openEdit(c)}
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
      )}

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add Customer" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <CustomerFormFields form={addForm} onChange={(f, v) => setAddForm((p) => ({ ...p, [f]: v }))} />
            {addError && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{addError}</div>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" disabled={addLoading} className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                {addLoading ? "Saving…" : "Save Customer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editCustomer && (
        <Modal title="Edit Customer" onClose={() => setEditCustomer(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <CustomerFormFields form={editForm} onChange={(f, v) => setEditForm((p) => ({ ...p, [f]: v }))} />
            {editError && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{editError}</div>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditCustomer(null)} className="flex-1 py-2 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" disabled={editLoading} className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                {editLoading ? "Saving…" : "Update Customer"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
