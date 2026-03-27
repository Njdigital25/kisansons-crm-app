import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import LeadsPage from "@/pages/LeadsPage";
import CustomersPage from "@/pages/CustomersPage";
import ProductsPage from "@/pages/ProductsPage";
import PurchasePage from "@/pages/PurchasePage";
import OrdersPage from "@/pages/OrdersPage";
import Layout from "@/components/Layout";
import type { Page } from "@/components/Layout";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!session) return <LoginPage />;

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":  return <DashboardPage />;
      case "leads":      return <LeadsPage />;
      case "customers":  return <CustomersPage />;
      case "products":   return <ProductsPage />;
      case "purchases":  return <PurchasePage />;
      case "orders":     return <OrdersPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}
