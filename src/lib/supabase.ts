import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Lead = {
  id: string;
  name?: string;
  phone?: string;
  village?: string;
  district?: string;
  source?: string;
  status?: string;
  assigned_to?: string;
  follow_up_date?: string;
  created_at?: string;
};

export type Customer = {
  id: string;
  name?: string;
  phone?: string;
  village?: string;
  created_at?: string;
};

export type Product = {
  id: string;
  name: string;
  selling_price: number;
  cost_price: number;
  stock: number;
  created_at?: string;
};

export type PurchaseInvoice = {
  id: string;
  supplier_name?: string;
  invoice_number?: string;
  date?: string;
  created_at?: string;
  purchase_items?: PurchaseItem[];
};

export type PurchaseItem = {
  id: string;
  invoice_id: string;
  product_id: string;
  quantity: number;
  cost_price: number;
  product?: Product;
};

export type Order = {
  id: string;
  customer_name?: string;
  status: string;
  notes?: string;
  created_at?: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  selling_price: number;
  product?: Product;
};
