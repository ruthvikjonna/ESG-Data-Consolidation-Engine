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
    href: "/integrations?service=manual",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    hoverBg: "hover:bg-blue-100",
    hoverBorder: "hover:border-blue-300",
  },
  {
    name: "Excel Import",
    description: "Import data from Excel via OneDrive Business.",
    icon: (
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-green-600 mx-auto mb-2"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} /><path strokeWidth={2} d="M8 8l8 8M16 8l-8 8" /></svg>
    ),
    href: "/integrations?service=excel",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    hoverBg: "hover:bg-green-100",
    hoverBorder: "hover:border-green-300",
  },
  {
    name: "Google Sheets",
    description: "Import data directly from Google Sheets.",
    icon: (
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-indigo-600 mx-auto mb-2">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    href: "/integrations?service=google",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    hoverBg: "hover:bg-indigo-100",
    hoverBorder: "hover:border-indigo-300",
  },
  {
    name: "QuickBooks",
    description: "Connect and import from QuickBooks Online.",
    icon: (
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-emerald-600 mx-auto mb-2"><circle cx="12" cy="12" r="10" strokeWidth={2} /><path strokeWidth={2} d="M8 12h8M12 8v8" /></svg>
    ),
    href: "/integrations?service=quickbooks",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    hoverBg: "hover:bg-emerald-100",
    hoverBorder: "hover:border-emerald-300",
  },
];

const webhookIntegrations = [
  {
    name: "Webhook Dashboard",
    description: "Monitor real-time ESG data updates and webhook activity.",
    icon: (
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-purple-600 mx-auto mb-2">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    href: "/webhooks",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    hoverBg: "hover:bg-purple-100",
    hoverBorder: "hover:border-purple-300",
  },
  {
    name: "Webhook Setup",
    description: "Configure automatic data updates from connected platforms.",
    icon: (
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-orange-600 mx-auto mb-2">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    href: "/webhooks/setup",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    hoverBg: "hover:bg-orange-100",
    hoverBorder: "hover:border-orange-300",
  },
];

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) router.push("/auth");
    });
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#18181B]">Bloom ESG – Dashboard</h1>
          <button
            onClick={() => {
              supabase.auth.signOut();
              router.push("/auth");
            }}
            className="text-sm text-[#18181B] border border-[#E5E7EB] rounded-md px-4 py-2 transition-all duration-200 bg-[#F3F4F6] hover:bg-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB] hover:shadow-sm"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <h2 className="text-3xl font-bold mb-8 sm:mb-12 text-[#18181B] text-center">Choose a Data Source</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {integrations.map((integration) => (
            <div 
              key={integration.name}
              onClick={() => router.push(integration.href)}
              className={`bg-white rounded-xl shadow hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer border ${integration.borderColor} ${integration.hoverBorder}`}
            >
              <div className={`${integration.bgColor} ${integration.hoverBg} p-6 flex flex-col items-center transition-colors duration-200`}>
                {integration.icon}
                <h3 className="text-xl font-semibold text-[#18181B] mb-1">{integration.name}</h3>
              </div>
              <div className="p-6 pt-4">
                <p className="text-gray-500 text-center text-sm">{integration.description}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-3xl font-bold mb-8 sm:mb-12 text-[#18181B] text-center">Automated Data Updates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {webhookIntegrations.map((integration) => (
            <div 
              key={integration.name}
              onClick={() => router.push(integration.href)}
              className={`bg-white rounded-xl shadow hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer border ${integration.borderColor} ${integration.hoverBorder}`}
            >
              <div className={`${integration.bgColor} ${integration.hoverBg} p-6 flex flex-col items-center transition-colors duration-200`}>
                {integration.icon}
                <h3 className="text-xl font-semibold text-[#18181B] mb-1">{integration.name}</h3>
              </div>
              <div className="p-6 pt-4">
                <p className="text-gray-500 text-center text-sm">{integration.description}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
