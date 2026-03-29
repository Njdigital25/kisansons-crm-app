import { useEffect, useState } from "react";
import { supabase, type Product, type PurchaseInvoice } from "@/lib/supabase";
import { addPurchaseInvoice, type PurchaseItemInput } from "@/lib/inventoryService";
import Modal from "@/components/Modal";

type ItemRow = {
  product_id: string;
  quantity: string;
  cost_price: string;
};

const emptyItem = (): ItemRow => ({ product_id: "", quantity: "", cost_price: "" });

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

async function generateNextPONumber(): Promise<string> {
  const { data } = await supabase
    .from("purchase_invoices")
    .select("invoice_number")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.invoice_number) return "PO-001";

  const match = data.invoice_number.match(/(\d+)$/);
  if (!match) return "PO-001";

  const next = parseInt(match[1]) + 1;
  return `PO-${String(next).padStart(3, "0")}`;
}

export default function PurchasePage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editInvoice, setEditInvoice] = useState<PurchaseInvoice | null>(null);
  const [editSupplierName, setEditSupplierName] = useState("");
  const [editInvoiceDate, setEditInvoiceDate] = useState("");
  const [editItems, setEditItems] = useState<ItemRow[]>([emptyItem()]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: inv }, { data: prod }] = await Promise.all([
      supabase.from("purchase_invoices").select("*, purchase_items(*, product:products(name, code))").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("name"),
    ]);
    setInvoices(inv ?? []);
    setProducts(prod ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const openNewPurchase = async () => {
    const nextPO = await generateNextPONumber();
    setInvoiceNumber(nextPO);
    setSupplierName("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setItems([emptyItem()]);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (inv: PurchaseInvoice) => {
    setEditInvoice(inv);
    setEditSupplierName(inv.supplier_name ?? "");
    setEditInvoiceDate(inv.date ?? new Date().toISOString().split("T")[0]);
    setEditItems((inv.purchase_items ?? []).map((item) => ({
      product_id: item.product_id,
      quantity: String(item.quantity),
      cost_price: String(item.cost_price),
    })));
    setEditError(null);
  };

  const updateItem = (idx: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "product_id" && value) {
        const product = products.find((p) => p.id === value);
        if (product) {
          next[idx].cost_price = String(product.cost_price);
        }
      }
      return next;
    });
  };

  const updateEditItem = (idx: number, field: keyof ItemRow, value: string) => {
    setEditItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "product_id" && value) {
        const product = products.find((p) => p.id === value);
        if (product) {
          next[idx].cost_price = String(product.cost_price);
        }
      }
      return next;
    });
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeEditItem = (idx: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setFormError(null);
    for (const item of items) {
      if (!item.product_id) { setFormError("Select a product for each row."); return; }
      if (!item.quantity || parseFloat(item.quantity) <= 0) { setFormError("Enter a valid quantity for each row."); return; }
    }

    setSaveLoading(true);
    const parsedItems: PurchaseItemInput[] = items.map((item) => ({
      product_id: item.product_id,
      quantity: parseInt(item.quantity),
      cost_price: parseFloat(item.cost_price) || 0,
    }));

    const { error } = await addPurchaseInvoice(
      { supplier_name: supplierName, invoice_number: invoiceNumber, date: invoiceDate },
      parsedItems
    );

    if (error) { setFormError(error); setSaveLoading(false); return; }

    setShowForm(false);
    await fetchData();
    showSuccess("Stock updated successfully!");
    setSaveLoading(false);
  };

  const handleEdit = async () => {
    if (!editInvoice) return;
    setEditError(null);
    for (const item of editItems) {
      if (!item.product_id) { setEditError("Select a product for each row."); return; }
      if (!item.quantity || parseFloat(item.quantity) <= 0) { setEditError("Enter a valid quantity for each row."); return; }
    }

    setEditLoading(true);

    // Update invoice header
    const { error: updateErr } = await supabase.from("purchase_invoices").update({
      supplier_name: editSupplierName || null,
      date: editInvoiceDate,
    }).eq("id", editInvoice.id);

    if (updateErr) { setEditError(updateErr.message); setEditLoading(false); return; }

    // Delete all existing items
    const { error: deleteItemsErr } = await supabase.from("purchase_items").delete().eq("invoice_id", editInvoice.id);
    if (deleteItemsErr) { setEditError(deleteItemsErr.message); setEditLoading(false); return; }

    // Insert new items
    const newItems = editItems.map((item) => ({
      invoice_id: editInvoice.id,
      product_id: item.product_id,
      quantity: parseInt(item.quantity),
      cost_price: parseFloat(item.cost_price) || 0,
    }));

    const { error: insertErr } = await supabase.from("purchase_items").insert(newItems);
    if (insertErr) { setEditError(insertErr.message); setEditLoading(false); return; }

    setEditInvoice(null);
    await fetchData();
    showSuccess("Purchase invoice updated successfully!");
    setEditLoading(false);
  };

  const handleDelete = async (invoiceId: string) => {
    setDeleteLoading(true);
    // Delete items first (or cascade)
    const { error: deleteItemsErr } = await supabase.from("purchase_items").delete().eq("invoice_id", invoiceId);
    if (deleteItemsErr) { setError(deleteItemsErr.message); setDeleteLoading(false); setDeleteConfirm(null); return; }

    // Delete invoice
    const { error: deleteInvoiceErr } = await supabase.from("purchase_invoices").delete().eq("id", invoiceId);
    if (deleteInvoiceErr) { setError(deleteInvoiceErr.message); setDeleteLoading(false); setDeleteConfirm(null); return; }

    setDeleteConfirm(null);
    await fetchData();
    showSuccess("Purchase invoice deleted successfully!");
    setDeleteLoading(false);
  };

  const totalCost = (inv: PurchaseInvoice) =>
    (inv.purchase_items ?? []).reduce((s, i) => s + i.quantity * i.cost_price, 0);

  const productLabel = (p: Product) => `${p.code ? `[${p.code}] ` : ""}${p.name}${p.size ? ` – ${p.size}` : ""}`;

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
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length} purchase invoices</p>
        </div>
        <button onClick={openNewPurchase}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Purchase
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span><button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">No purchase invoices yet.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                {["Invoice #", "Supplier", "Date", "Products", "Total Cost", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/70 transition">
                  <td className="px-5 py-3.5 font-bold text-indigo-700 font-mono">{inv.invoice_number ?? "—"}</td>
                  <td className="px-5 py-3.5 text-gray-700">{inv.supplier_name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{inv.date ? new Date(inv.date).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">
                    {(inv.purchase_items ?? []).map((i, idx) => {
                      const prod = Array.isArray(i.product) ? i.product[0] : i.product;
                      return (
                        <span key={idx} className="inline-flex items-center gap-1 mr-2">
                          {prod?.code && <span className="font-mono text-indigo-600 font-bold">[{prod.code}]</span>}
                          {prod?.name ?? "?"} ×{i.quantity}
                        </span>
                      );
                    })}
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 font-medium">₹ {totalCost(inv).toFixed(2)}</td>
                  <td className="px-5 py-3.5 flex items-center gap-2">
                    <button onClick={() => openEdit(inv)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Edit
                    </button>
                    <button onClick={() => setDeleteConfirm(inv.id)} className="text-red-600 hover:text-red-800 text-xs font-medium flex items-center gap-1 transition">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <p className="text-gray-700 font-medium mb-6">Are you sure you want to delete this purchase invoice? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleteLoading}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title={`New Purchase Invoice — ${invoiceNumber}`} onClose={() => setShowForm(false)} maxWidth="max-w-2xl">
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Supplier Name</label>
                <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Supplier name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Invoice Number</label>
                <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={`${inputCls} font-mono font-bold text-indigo-700`} />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Products</p>
                <button type="button" onClick={() => setItems((p) => [...p, emptyItem()])}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add row
                </button>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
                  <div className="col-span-5">Product (Code)</div>
                  <div className="col-span-3">Quantity</div>
                  <div className="col-span-3">Cost Price (₹)</div>
                  <div className="col-span-1"></div>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select value={item.product_id} onChange={(e) => updateItem(idx, "product_id", e.target.value)} className={inputCls}>
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{productLabel(p)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} placeholder="Qty" className={inputCls} />
                    </div>
                    <div className="col-span-3">
                      <input type="number" min="0" step="0.01" value={item.cost_price} onChange={(e) => updateItem(idx, "cost_price", e.target.value)} placeholder="0.00" className={inputCls} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {formError && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{formError}</div>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saveLoading}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                {saveLoading ? "Saving…" : "Save Purchase & Update Stock"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editInvoice && (
        <Modal title={`Edit Purchase Invoice — ${editInvoice.invoice_number}`} onClose={() => setEditInvoice(null)} maxWidth="max-w-2xl">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Supplier Name</label>
                <input type="text" value={editSupplierName} onChange={(e) => setEditSupplierName(e.target.value)} placeholder="Supplier name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" value={editInvoiceDate} onChange={(e) => setEditInvoiceDate(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Products</p>
                <button type="button" onClick={() => setEditItems((p) => [...p, emptyItem()])}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add row
                </button>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
                  <div className="col-span-5">Product (Code)</div>
                  <div className="col-span-3">Quantity</div>
                  <div className="col-span-3">Cost Price (₹)</div>
                  <div className="col-span-1"></div>
                </div>

                {editItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select value={item.product_id} onChange={(e) => updateEditItem(idx, "product_id", e.target.value)} className={inputCls}>
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{productLabel(p)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateEditItem(idx, "quantity", e.target.value)} placeholder="Qty" className={inputCls} />
                    </div>
                    <div className="col-span-3">
                      <input type="number" min="0" step="0.01" value={item.cost_price} onChange={(e) => updateEditItem(idx, "cost_price", e.target.value)} placeholder="0.00" className={inputCls} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {editItems.length > 1 && (
                        <button type="button" onClick={() => removeEditItem(idx)} className="text-gray-300 hover:text-red-400 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {editError && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{editError}</div>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditInvoice(null)} className="flex-1 py-2 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button type="button" onClick={handleEdit} disabled={editLoading}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                {editLoading ? "Updating…" : "Update Purchase Invoice"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
