'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';

interface UserData {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/v2/me', {
          credentials: 'include'
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          // Redirect to login page if not authenticated
          router.push('/');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();

    // Re-check auth on focus (in case the user logs out in another tab)
    const handleFocus = () => {
      checkAuth();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/v2/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Force a hard redirect to root to ensure complete state reset
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if the logout API call fails
      window.location.href = '/';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-400 to-blue-600 shadow-md">
        <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
                <path d="M9 13.414l-1.707-1.707a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 10-1.414-1.414L11 13.414V8a1 1 0 10-2 0v5.414z" />
              </svg>
              <Link href="/user/dashboard" className="text-3xl font-bold text-white">Storage Dashboard</Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <Link 
                  href="/user/dashboard"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition shadow-sm"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/user/docs"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition shadow-sm"
                >
                  Documentation
                </Link>
                <Link 
                  href="/user/test"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition shadow-sm"
                >
                  API Testing
                </Link>
                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                  <Link 
                    href="/admin"
                    className="px-4 py-2 bg-white text-blue-600 rounded-md shadow-sm text-sm font-medium hover:bg-gray-100 transition"
                  >
                    Admin Panel
                  </Link>
                )}
              </div>
              
              <div className="flex items-center bg-blue-500/50 backdrop-blur-sm rounded-lg pl-3 pr-2 py-2 shadow-sm">
                <div className="mr-3">
                  <div className="text-sm font-medium text-white">
                    {user?.name || user?.email?.split('@')[0] || 'User'}
                  </div>
                  <div className="text-xs text-white/80">
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'} • {user?.email}
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center px-3 py-1.5 bg-white/90 hover:bg-white text-blue-600 rounded-md transition shadow-sm"
                  title="Logout"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
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
