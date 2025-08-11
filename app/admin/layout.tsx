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
    checkAuth();

    // Re-check auth on focus (in case the user logs out in another tab)
    const handleFocus = () => {
      // Debounce auth checks to prevent too many requests
      const now = Date.now();
      if (now - lastAuthCheck > 10000) { // Only check if 10 seconds have passed since last check
        checkAuth();
      }
    };

    // Add a listener for auth state changes
    const authCheckInterval = setInterval(() => {
      checkAuth();
    }, 300000); // Check every 5 minutes (300000ms) instead of every 50 seconds

    // Listen for storage events (for cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authStateChanged' || e.key === 'loginSuccess') {
        const now = Date.now();
        if (now - lastAuthCheck > 10000) { // Only check if 10 seconds have passed since last check
          checkAuth();
        }
      }
    };

    // Listen for custom login state change events (same-tab communication)
    const handleLoginStateChange = () => {
      const now = Date.now();
      if (now - lastAuthCheck > 10000) { // Only check if 10 seconds have passed since last check
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

  async function checkAuth() {
    // Update the last auth check time
    setLastAuthCheck(Date.now());
    
    try {
      const res = await fetch('/api/auth/v2/me', {
        credentials: 'include'  // Important for sending cookies
      });
      
      if (res.ok) {
        const userData = await res.json();
        console.log("User data received:", JSON.stringify(userData, null, 2)); // Detailed logging
        
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
          router.replace('/admin/login');
        }
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
      <header className="bg-gradient-to-r from-blue-400 to-teal-400 shadow-md">
        <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              <Link href="/admin" className="text-3xl font-bold text-white hover:text-white/90 transition-colors">Admin Portal</Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                {user ? (
                  // Menu options for logged in admin users
                  <>
                    <Link 
                      href="/admin"
                      className="px-4 py-2 text-sm font-medium text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href="/admin/users"
                      className="px-4 py-2 text-sm font-medium text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                    >
                      Manage Users
                    </Link>
                    <Link 
                      href="/admin/warehouses"
                      className="px-4 py-2 text-sm font-medium text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                    >
                      Manage Warehouses
                    </Link>
                  </>
                ) : (
                  // Only show Return Home for non-logged in users
                  <Link 
                    href="/"
                    className="px-4 py-2 text-sm font-medium text-white hover:bg-white/20 rounded-lg transition-all duration-200"
                  >
                    Return Home
                  </Link>
                )}
              </div>
              
              {user ? (
                // User profile and logout for logged in users
                <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg pl-3 pr-2 py-2 shadow-sm">
                  <div className="mr-3">
                    <div className="text-sm font-medium text-white">
                      {user.name || (user.email ? user.email.split('@')[0] : 'Admin')}
                    </div>
                    <div className="text-xs text-white/80">
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)} • {user.email}
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center px-3 py-1.5 bg-white/90 hover:bg-white text-blue-600 rounded-lg transition-all duration-200 shadow-sm"
                    title="Logout"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              ) : (
                // Login button for non-logged in users
                <Link 
                  href="/admin/login"
                  className="flex items-center px-4 py-2 bg-white/90 hover:bg-white text-blue-600 rounded-lg transition-all duration-200 shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {children}
      
      {/* Footer */}
       <footer className="bg-white/80 backdrop-blur-sm border-t border-slate-200/50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-slate-600">
            <p className="mb-2">&copy; {new Date().getFullYear()} Secure File Management System. All rights are with <a href="https://github.com/ashishkr375" className="text-blue-600 hover:underline">Ashish Kumar</a></p>
            <p className="mb-1">
              <a href="https://github.com/ashishkr375/file-management-system" className="text-blue-600 hover:underline">Open Source on GitHub</a> • 
              <a href="https://www.linkedin.com/in/ashish-kumar-nitp" className="text-blue-600 hover:underline ml-2">Connect on LinkedIn</a>
            </p>
            <p className="text-xs">Free to use with proper attribution</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
