'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Store token in cookie for middleware
        document.cookie = `sb-token=${session.access_token}; path=/; secure; samesite=lax`;
      }
      
      setIsLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Store token in cookie
          document.cookie = `sb-token=${session.access_token}; path=/; secure; samesite=lax`;
          router.push('/');
        } else if (event === 'SIGNED_OUT') {
          // Remove token from cookie
          document.cookie = 'sb-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
          router.push('/auth/signin');
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Wird geladen...</div>
      </div>
    );
  }

  return <>{children}</>;
}
