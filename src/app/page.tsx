'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
  // Auth state and input values
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Current logged-in user state
  const [user, setUser] = useState<any>(null);

  const router = useRouter();

  // Run once: check if a session already exists and redirect to /upload
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        router.push('/upload');
      }
    });

    // Set up a listener for any auth changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        router.push('/upload');
      }
    });

    // Clean up listener when component unmounts
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [router]);

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
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // If the user is logged in, don't render this page (redirect handled above)
  if (user) {
    return null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8">Bloom ESG</h1>
        <h2 className="text-xl font-semibold text-center mb-6">
          {authMode === 'sign-in' ? 'Welcome Back' : 'Create Account'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {authMode === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </button>

          <button
            type="button"
            onClick={() => setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in')}
            className="w-full text-blue-600 hover:text-blue-700 text-sm"
          >
            {authMode === 'sign-in' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </button>

          {authError && (
            <p className="text-red-600 text-sm text-center">{authError}</p>
          )}
        </form>
      </div>
    </main>
  );
}
