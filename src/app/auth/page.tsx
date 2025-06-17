"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  // Handle sign-in or sign-up form submission
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authMode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="max-w-md w-full p-10 bg-white rounded-xl shadow-lg border border-[#E5E7EB]">
        <h1 className="text-3xl font-bold text-center mb-6 text-[#18181B]">Bloom</h1>
        <h2 className="text-lg font-semibold text-center mb-8 text-[#18181B]">
          {authMode === 'sign-in' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#18181B] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-[#E5E7EB] rounded-md bg-[#F8FAFC] text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#18181B] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-[#E5E7EB] rounded-md bg-[#F8FAFC] text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#2563EB] text-white py-2 px-4 rounded-md font-semibold hover:bg-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 transition-colors duration-150"
          >
            {authMode === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </button>
          <button
            type="button"
            onClick={() => setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in')}
            className="w-full text-[#2563EB] hover:text-[#1D4ED8] text-sm font-semibold mt-2"
          >
            {authMode === 'sign-in' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </button>
          {authError && (
            <p className="text-red-600 text-sm text-center font-semibold mt-2">{authError}</p>
          )}
        </form>
      </div>
    </main>
  );
} 