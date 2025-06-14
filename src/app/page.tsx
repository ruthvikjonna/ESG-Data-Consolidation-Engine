"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const integrations = [
  {
    name: "Manual Upload",
    description: "Upload CSV, Excel, or JSON files directly.",
    icon: (
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-blue-600 mx-auto mb-2"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" /></svg>
    ),
    href: "/manual-upload",
  },
  {
    name: "Excel Import",
    description: "Import data from Excel via OneDrive Business.",
    icon: (
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-600 mx-auto mb-2"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} /><path strokeWidth={2} d="M8 8l8 8M16 8l-8 8" /></svg>
    ),
    href: "/excel-import",
  },
  {
    name: "QuickBooks",
    description: "Connect and import from QuickBooks Online.",
    icon: (
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-emerald-600 mx-auto mb-2"><circle cx="12" cy="12" r="10" strokeWidth={2} /><path strokeWidth={2} d="M8 12h8M12 8v8" /></svg>
    ),
    href: "/quickbooks",
  },
];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) router.push("/signin");
    });
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#18181B]">Bloom ESG – Dashboard</h1>
          <button
            onClick={() => {
              supabase.auth.signOut();
              router.push("/signin");
            }}
            className="text-sm text-[#18181B] border border-[#E5E7EB] rounded px-4 py-2 transition-colors duration-150 bg-[#F3F4F6] hover:bg-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold mb-10 text-[#18181B] text-center">Choose a Data Source</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {integrations.map((integration) => (
            <button
              key={integration.name}
              onClick={() => router.push(integration.href)}
              className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow duration-150 p-8 flex flex-col items-center border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              {integration.icon}
              <span className="text-xl font-semibold text-[#18181B] mb-2">{integration.name}</span>
              <span className="text-gray-500 text-center">{integration.description}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
