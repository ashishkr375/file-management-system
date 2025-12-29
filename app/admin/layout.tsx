'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';

interface UserData {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAuthCheck, setLastAuthCheck] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Only run initial auth check if not already authenticated
    if (!user) {
      checkAuth();
    }

    // Re-check auth on focus (in case the user logs out in another tab)
    const handleFocus = () => {
      // Debounce auth checks to prevent too many requests
      const now = Date.now();
      if (now - lastAuthCheck > 30000) { // Only check if 30 seconds have passed since last check
        checkAuth();
      }
    };

    // Add a listener for auth state changes, but check less frequently
    const authCheckInterval = setInterval(() => {
      // Only recheck if not loading and enough time has passed
      if (!isLoading && Date.now() - lastAuthCheck > 300000) {
        checkAuth();
      }
    }, 600000); // Check every 10 minutes (600000ms)

    // Listen for storage events (for cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authStateChanged' || e.key === 'loginSuccess') {
        const now = Date.now();
        if (now - lastAuthCheck > 30000) { // Only check if 30 seconds have passed since last check
          checkAuth();
        }
      }
    };

    // Listen for custom login state change events (same-tab communication)
    const handleLoginStateChange = () => {
      const now = Date.now();
      if (now - lastAuthCheck > 30000) { // Only check if 30 seconds have passed since last check
        checkAuth();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('loginStateChanged', handleLoginStateChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('loginStateChanged', handleLoginStateChange);
      clearInterval(authCheckInterval);
    };
  }, [lastAuthCheck]);

  // Debounced checkAuth function with timeout tracking
  let authCheckInProgress = false;
  let authCheckTimeout: NodeJS.Timeout | null = null;
  
  async function checkAuth() {
    // Prevent multiple simultaneous auth checks
    if (authCheckInProgress) {
      return;
    }
    
    // Update the last auth check time
    const now = Date.now();
    setLastAuthCheck(now);
    authCheckInProgress = true;
    
    // Set a timeout to ensure the check completes
    if (authCheckTimeout) {
      clearTimeout(authCheckTimeout);
    }
    authCheckTimeout = setTimeout(() => {
      authCheckInProgress = false;
    }, 10000); // Force reset after 10 seconds
    
    try {
      // Use cache control to prevent browsers from caching the response
      const res = await fetch('/api/auth/v2/me', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (res.ok) {
        const userData = await res.json();
        console.log("User data received at:", new Date().toISOString());
        
        // Only allow admin or superadmin to access this section
        if (userData.role === 'admin' || userData.role === 'superadmin') {
          // Ensure name is properly assigned if available
          setUser({
            id: userData.id,
            email: userData.email,
            role: userData.role,
            // Make sure name is properly extracted and not undefined
            name: userData.name || userData.email?.split('@')[0] || ''
          });
        } else {
          // If logged in but not admin, show error
          toast.error('You do not have permission to access this page');
          // Only redirect if we're not already on the login page
          if (window.location.pathname !== '/admin/login') {
            router.replace('/admin/login');
          }
        }
      } else if (res.status === 429) {
        // Rate limit error - wait longer before retrying
        console.warn("Rate limit reached for authentication checks");
        // Don't update user state or redirect - just wait
      } else {
        // Not logged in or session expired
        setUser(null);
        // Don't redirect immediately for non-logged in state to allow showing the "Return Home" option
        if (window.location.pathname !== '/admin/login') {
          router.replace('/admin/login');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      if (window.location.pathname !== '/admin/login') {
        router.replace('/admin/login');
      }
    } finally {
      setIsLoading(false);
      authCheckInProgress = false;
      if (authCheckTimeout) {
        clearTimeout(authCheckTimeout);
        authCheckTimeout = null;
      }
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/v2/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      toast.success('Logged out successfully');
      
      // Reset state
      setUser(null);
      
      // Signal auth state change for cross-tab communication
      localStorage.setItem('authStateChanged', Date.now().toString());
      
      // Force reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1000);
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  // Now we can show a different layout based on login status
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Toaster position="top-right" />
      
      {/* Header */}
     
      
      {children}
      
    
    </div>
  );
}
