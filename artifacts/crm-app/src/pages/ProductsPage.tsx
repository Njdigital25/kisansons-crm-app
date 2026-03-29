import { useEffect, useState } from "react";
import { supabase, type Product } from "@/lib/supabase";
import Modal from "@/components/Modal";

type ProductForm = {
  name: string;
  code: string;
  size: string;
  selling_price: string;
  cost_price: string;
};

const emptyForm: ProductForm = { name: "", code: "", size: "", selling_price: "", cost_price: "" };

const SIZE_PRESETS = ["250 ML", "500 ML", "1 Liter", "2 Liter", "250 Gm", "500 Gm", "1 KG", "5 KG", "10 KG", "1 Piece", "Pack of 6", "Pack of 12"];

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

function StockBar({ stock }: { stock: number }) {
  if (stock === 0) return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Out of stock</span>
    </div>
  );
  if (stock <= 5) return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-orange-600">{stock}</span>
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">Low stock</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-green-700">{stock}</span>
      <span className="text-xs text-gray-400">units</span>
    </div>
  );
}

function ProductFormFields({ form, onChange }: {
  form: ProductForm;
  onChange: (f: keyof ProductForm, v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Product Name <span className="text-red-500">*</span></label>
          <input type="text" value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. Coconut Biscuit" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Product Code <span className="text-red-500">*</span></label>
          <input type="text" value={form.code} onChange={(e) => onChange("code", e.target.value.toUpperCase())} placeholder="e.g. CB1, CB5" className={inputCls} />
          <p className="text-xs text-gray-400 mt-0.5">Unique code used in invoices</p>
        </div>
      </div>
      <div>
        <label className={labelCls}>Size / Variant</label>
        <div className="flex gap-2">
          <input type="text" value={form.size} onChange={(e) => onChange("size", e.target.value)} placeholder="e.g. 1 KG, 500 ML, 1 Liter" className={inputCls} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SIZE_PRESETS.map((s) => (
            <button key={s} type="button" onClick={() => onChange("size", s)}
              className={`text-xs px-2.5 py-1 rounded-full border transition ${form.size === s ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Selling Price (₹)</label>
          <input type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => onChange("selling_price", e.target.value)} placeholder="0.00" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Cost Price (₹)</label>
          <input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => onChange("cost_price", e.target.value)} placeholder="0.00" className={inputCls} />
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<ProductForm>(emptyForm);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("name");
    if (error) setError(error.message);
    else setProducts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) { setAddError("Product name is required."); return; }
    if (!addForm.code.trim()) { setAddError("Product code is required."); return; }
    setAddError(null); setAddLoading(true);

    const { data: existing } = await supabase.from("products").select("id").eq("code", addForm.code.trim()).maybeSingle();
    if (existing) { setAddError(`Code "${addForm.code}" is already used by another product.`); setAddLoading(false); return; }

    const { error } = await supabase.from("products").insert([{
      name: addForm.name.trim(),
      code: addForm.code.trim(),
      size: addForm.size.trim() || null,
      selling_price: parseFloat(addForm.selling_price) || 0,
      cost_price: parseFloat(addForm.cost_price) || 0,
      stock: 0,
    }]);
    if (error) { setAddError(error.message); setAddLoading(false); return; }
    setShowAdd(false); setAddForm(emptyForm);
    await fetchProducts();
    showSuccess("Product added successfully!");
    setAddLoading(false);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditForm({ name: p.name, code: p.code ?? "", size: p.size ?? "", selling_price: String(p.selling_price), cost_price: String(p.cost_price) });
    setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    if (!editForm.name.trim()) { setEditError("Product name is required."); return; }
    if (!editForm.code.trim()) { setEditError("Product code is required."); return; }
    setEditError(null); setEditLoading(true);

    const { data: existing } = await supabase.from("products").select("id").eq("code", editForm.code.trim()).neq("id", editProduct.id).maybeSingle();
    if (existing) { setEditError(`Code "${editForm.code}" is already used by another product.`); setEditLoading(false); return; }

    const { error } = await supabase.from("products").update({
      name: editForm.name.trim(),
      code: editForm.code.trim(),
      size: editForm.size.trim() || null,
      selling_price: parseFloat(editForm.selling_price) || 0,
      cost_price: parseFloat(editForm.cost_price) || 0,
    }).eq("id", editProduct.id);
    if (error) { setEditError(error.message); setEditLoading(false); return; }
    setEditProduct(null);
    await fetchProducts();
    showSuccess("Product updated successfully!");
    setEditLoading(false);
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.code ?? "").toLowerCase().includes(q) || (p.size ?? "").toLowerCase().includes(q);
  });

  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const lowStock = products.filter((p) => p.stock <= 5).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      {success && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length} products · {totalStock} total units
            {lowStock > 0 && <span className="ml-2 text-orange-500">· {lowStock} low stock</span>}
            {outOfStock > 0 && <span className="ml-2 text-red-500">· {outOfStock} out of stock</span>}
          </p>
        </div>
        <button onClick={() => { setShowAdd(true); setAddError(null); setAddForm(emptyForm); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Product
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code or size…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white" />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span><button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading products…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          {search ? "No products match your search." : "No products yet. Add your first product!"}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                {["Code", "Product", "Size", "Selling Price", "Cost Price", "Stock", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/70 transition">
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-bold font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{p.code ?? "—"}</span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{p.size ?? "—"}</td>
                  <td className="px-5 py-3.5 text-gray-700">₹ {Number(p.selling_price).toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-gray-500">₹ {Number(p.cost_price).toFixed(2)}</td>
                  <td className="px-5 py-3.5"><StockBar stock={p.stock} /></td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => openEdit(p)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Product" onClose={() => setShowAdd(false)} maxWidth="max-w-xl">
          <form onSubmit={handleAdd} className="space-y-4">
            <ProductFormFields form={addForm} onChange={(f, v) => setAddForm((p) => ({ ...p, [f]: v }))} />
            {addError && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{addError}</div>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" disabled={addLoading} className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                {addLoading ? "Saving…" : "Save Product"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editProduct && (
        <Modal title="Edit Product" onClose={() => setEditProduct(null)} maxWidth="max-w-xl">
          <form onSubmit={handleEdit} className="space-y-4">
            <ProductFormFields form={editForm} onChange={(f, v) => setEditForm((p) => ({ ...p, [f]: v }))} />
            {editError && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{editError}</div>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditProduct(null)} className="flex-1 py-2 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" disabled={editLoading} className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                {editLoading ? "Saving…" : "Update Product"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
