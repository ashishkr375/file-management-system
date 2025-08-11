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
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();

    // Re-check auth on focus (in case the user logs out in another tab)
    const handleFocus = () => {
      checkAuth();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        // Only allow admin or superadmin to access this section
        if (userData.role === 'admin' || userData.role === 'superadmin') {
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          // If logged in but not admin, show error
          toast.error('You do not have permission to access this page');
          setShowLoginForm(true);
        }
      } else {
        // Show login form instead of redirecting
        setShowLoginForm(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setShowLoginForm(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const loadingToast = toast.loading('Logging in...');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const userData = await res.json();
        toast.dismiss(loadingToast);

        if (userData.role === 'admin' || userData.role === 'superadmin') {
          toast.success('Admin login successful!');
          setUser(userData);
          setIsAuthenticated(true);
          setShowLoginForm(false);
        } else {
          toast.error('You do not have admin privileges');
        }
      } else {
        const error = await res.json();
        toast.dismiss(loadingToast);
        toast.error(error.error || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast.dismiss(loadingToast);
      toast.error('Login failed. Please try again later.');
    }
  }

  const handleLogout = () => {
    // Clear the auth token cookie properly
    document.cookie = 'token=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure;';
    
    toast.success('Logged out successfully');
    
    // Reset state
    setIsAuthenticated(false);
    setUser(null);
    setShowLoginForm(true);
    
    // Force reload to ensure clean state
    setTimeout(() => {
      window.location.href = '/admin';
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 flex flex-col">
        <Toaster position="top-right" />
        
        {/* Modern Header */}
        <header className="bg-gradient-to-r from-blue-600 to-teal-400 shadow-lg">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                <h1 className="text-4xl font-bold text-white tracking-tight">Admin Portal</h1>
              </div>
              <Link 
                href="/"
                className="group px-5 py-2.5 bg-white/95 hover:bg-white text-blue-600 rounded-lg shadow-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 hover:scale-105 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span>Back to Home</span>
              </Link>
            </div>
          </div>
        </header>
        
        {/* Login Form */}
        <div className="flex-grow flex items-center justify-center p-6">
          <div className="p-10 max-w-md w-full bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-400 mb-6 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Welcome Back</h2>
              <p className="text-slate-600 mt-3">Sign in to your admin account</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-teal-400 text-white py-3.5 px-4 rounded-xl hover:from-blue-700 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                Sign In to Dashboard
              </button>
              <div className="text-center mt-6">
                <Link 
                  href="/" 
                  className="text-sm text-slate-600 hover:text-slate-800 transition-colors flex items-center justify-center space-x-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  <span>Back to main login</span>
                </Link>
              </div>
            </form>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="bg-white/80 backdrop-blur-sm border-t border-slate-200/50">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="text-center text-sm text-slate-600">
              <p className="mb-2">&copy; {new Date().getFullYear()} NextJS Local S3 Admin Portal. All rights are with <a href="https://github.com/ashishkr375" className="text-blue-600 hover:underline">Ashish Kumar</a></p>
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
              </div>
              
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg pl-3 pr-2 py-2 shadow-sm">
                <div className="mr-3">
                  <div className="text-sm font-medium text-white">
                    {user?.name || user?.email?.split('@')[0] || 'Admin'}
                  </div>
                  <div className="text-xs text-white/80">
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin'} • {user?.email}
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
