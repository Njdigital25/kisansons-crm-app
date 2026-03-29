import { useEffect, useRef, useState } from "react";
import { supabase, type Product, type Order, type Customer } from "@/lib/supabase";
import { updateStockOnShipment } from "@/lib/inventoryService";
import Modal from "@/components/Modal";

const ORDER_STATUSES = ["New", "Processing", "Shipped", "Cancelled"];

type ItemRow = { product_id: string; quantity: string; selling_price: string };
const emptyItem = (): ItemRow => ({ product_id: "", quantity: "", selling_price: "" });

const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

const statusColor = (s: string) => ({
  New: "bg-indigo-50 text-indigo-700 border-indigo-100",
  Processing: "bg-blue-50 text-blue-700 border-blue-100",
  Shipped: "bg-green-50 text-green-700 border-green-100",
  Cancelled: "bg-red-50 text-red-600 border-red-100",
})[s] ?? "bg-gray-50 text-gray-600 border-gray-100";

function CustomerSearchInput({
  value, onChange, onSelectCustomer, customers,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelectCustomer: (c: Customer) => void;
  customers: Customer[];
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = value.trim().length > 0
    ? customers.filter((c) =>
        (c.name ?? "").toLowerCase().includes(value.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        placeholder="Type to search customers…"
        className={inputCls}
        autoComplete="off"
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelectCustomer(c);
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition text-sm"
            >
              <p className="font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-400">{c.phone ?? "No phone"} {c.address ? `· ${c.address}` : ""}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: ord }, { data: prod }, { data: cust }] = await Promise.all([
      supabase.from("orders").select("*, order_items(*, product:products(id, name, code, stock, selling_price))").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("name"),
      supabase.from("customers").select("*").order("name"),
    ]);
    setOrders(ord ?? []);
    setProducts(prod ?? []);
    setCustomers(cust ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg); setTimeout(() => setSuccess(null), 4000);
  };

  const updateItem = (idx: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "product_id" && value) {
        const product = products.find((p) => p.id === value);
        if (product) next[idx].selling_price = String(product.selling_price);
      }
      return next;
    });
  };

  const resetForm = () => {
    setCustomerName(""); setPhone(""); setAddress(""); setNotes(""); setItems([emptyItem()]); setFormError(null);
  };

  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(c.name ?? "");
    setPhone(c.phone ?? "");
    setAddress(c.address ?? "");
  };

  const handleSave = async () => {
    setFormError(null);
    for (const item of items) {
      if (!item.product_id) { setFormError("Select a product for each row."); return; }
      if (!item.quantity || parseInt(item.quantity) <= 0) { setFormError("Enter a valid quantity for each row."); return; }
    }
    setSaveLoading(true);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert([{
        customer_name: customerName || null,
        phone: phone || null,
        address: address || null,
        notes: notes || null,
        status: "New",
      }])
      .select("id").single();

    if (orderErr || !order) { setFormError(orderErr?.message ?? "Failed to create order."); setSaveLoading(false); return; }

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: parseInt(item.quantity),
      selling_price: parseFloat(item.selling_price) || 0,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
    if (itemsErr) { setFormError(itemsErr.message); setSaveLoading(false); return; }

    setShowForm(false);
    resetForm();
    await fetchData();
    showSuccess("Order created successfully!");
    setSaveLoading(false);
  };

  const handleStatusChange = async (order: Order, newStatus: string) => {
    if (newStatus === order.status) return;
    setStatusLoading(order.id);

    if (newStatus === "Shipped") {
      const { error: stockErr } = await updateStockOnShipment(order.id);
      if (stockErr) {
        setError(stockErr);
        setStatusLoading(null);
        return;
      }
    }

    const { data, error: statusErr } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id)
      .select("id");

    if (statusErr || !data || data.length === 0) {
      setError(statusErr?.message ?? "Status update failed. Check database permissions.");
      setStatusLoading(null);
      return;
    }

    setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: newStatus } : o));
    setStatusLoading(null);

    if (newStatus === "Shipped") {
      await fetchData();
      showSuccess("Order shipped. Stock updated successfully!");
    }
  };

  const orderTotal = (order: Order) =>
    (order.order_items ?? []).reduce((s, i) => s + i.quantity * i.selling_price, 0);

  const productLabel = (p: Product) =>
    `${p.code ? `[${p.code}] ` : ""}${p.name}${p.size ? ` – ${p.size}` : ""} (stock: ${p.stock})`;

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
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orders.length} total orders · Stock deducted only on Shipped</p>
        </div>
        <button onClick={() => { setShowForm(true); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Order
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 shrink-0">✕</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">No orders yet.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-left">
                {["Customer", "Phone", "Items", "Total", "Status", "Date"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/70 transition">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-900">{order.customer_name ?? "Walk-in"}</p>
                    {order.address && <p className="text-xs text-gray-400 mt-0.5">{order.address}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{order.phone ?? "—"}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">
                    {(order.order_items ?? []).map((i, idx) => {
                      const prod = Array.isArray(i.product) ? i.product[0] : i.product;
                      return (
                        <span key={idx} className="inline-flex items-center gap-1 mr-2">
                          {prod?.code && <span className="font-mono text-indigo-600 font-bold">[{prod.code}]</span>}
                          {prod?.name ?? "?"} ×{i.quantity}
                        </span>
                      );
                    })}
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 font-medium">₹ {orderTotal(order).toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    {statusLoading === order.id ? (
                      <span className="text-xs text-gray-400">Updating…</span>
                    ) : (
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 transition ${statusColor(order.status)}`}
                      >
                        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal title="New Order" onClose={() => setShowForm(false)} maxWidth="max-w-2xl">
          <div className="space-y-4">
            {/* Customer search */}
            <div>
              <label className={labelCls}>Customer Name</label>
              <CustomerSearchInput
                value={customerName}
                onChange={setCustomerName}
                onSelectCustomer={handleSelectCustomer}
                customers={customers}
              />
            </div>

            {/* Phone + Address */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Address / Village</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address or village" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Notes (optional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Order notes…" className={inputCls} />
            </div>

            {/* Products */}
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
                  <div className="col-span-3">Selling Price (₹)</div>
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
                      <input type="number" min="0" step="0.01" value={item.selling_price} onChange={(e) => updateItem(idx, "selling_price", e.target.value)} placeholder="0.00" className={inputCls} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {items.length > 1 && (
                        <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400 transition">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-600">
              Stock is <strong>not</strong> deducted when creating an order — only when status changes to <strong>Shipped</strong>.
            </div>

            {formError && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{formError}</div>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saveLoading}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition">
                {saveLoading ? "Saving…" : "Create Order"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
