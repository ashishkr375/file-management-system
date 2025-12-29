'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    
    // Custom toast style for dark theme
    const toastStyle = {
      style: {
        background: '#1a1a1a',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
        fontFamily: 'monospace',
      },
    };

    const loadingToast = toast.loading('VERIFYING CREDENTIALS...', toastStyle);
    
    try {
      const res = await fetch('/api/auth/v2/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (res.ok) {
        const userData = await res.json();
        toast.dismiss(loadingToast);

        if (userData.role === 'admin' || userData.role === 'superadmin') {
          toast.success('ACCESS GRANTED', { ...toastStyle, icon: '🔓' });
          
          localStorage.setItem('loginSuccess', Date.now().toString());
          window.dispatchEvent(new Event('loginStateChanged'));
          
          setTimeout(() => {
            window.location.href = '/admin';
          }, 800);
        } else {
          toast.error('ACCESS DENIED: INSUFFICIENT PRIVILEGES', { ...toastStyle, icon: '⛔' });
          setIsLoading(false);
        }
      } else {
        const error = await res.json();
        toast.dismiss(loadingToast);
        toast.error(error.error || 'AUTHENTICATION FAILED', { ...toastStyle, icon: '❌' });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast.dismiss(loadingToast);
      toast.error('SYSTEM ERROR: CONNECTION LOST', { ...toastStyle, icon: '⚠️' });
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-red-500 selection:text-black flex flex-col relative overflow-hidden">
      <Toaster position="top-right" />

      {/* Background Grid & Red Ambient Light for "Danger/Admin" feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-32 bg-red-900/10 blur-[120px] pointer-events-none"></div>

      {/* HEADER */}
      <header className="border-b border-white/10 bg-[#050505]/80 backdrop-blur-md relative z-50">
        <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 flex items-center justify-center text-black font-bold font-mono">
              ADM
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-white uppercase tracking-wider leading-none">
                Command_Center
              </h1>
              <span className="text-[10px] font-mono text-red-500">RESTRICTED_AREA</span>
            </div>
          </div>
          
          <Link 
            href="/" 
            className="text-[10px] font-mono text-gray-500 hover:text-white transition-colors border-b border-transparent hover:border-white"
          >
            ← RETURN_TO_PUBLIC_GATEWAY
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-grow flex items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Warning Banner */}
          <div className="bg-red-500/10 border border-red-500/30 p-3 mb-4 flex items-center gap-3">
             <div className="w-2 h-2 bg-red-500 animate-pulse rounded-full"></div>
             <p className="text-[10px] font-mono text-red-400 uppercase tracking-wide">
                Warning: Unauthorized access is prohibited and logged.
             </p>
          </div>

          {/* Login Module */}
          <div className="bg-[#0a0a0a] border border-white/10 relative overflow-hidden">
            {/* Decorative Top Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>
            
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto border border-white/10 flex items-center justify-center bg-[#050505] mb-4 text-red-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Admin Authentication</h2>
                <p className="text-[10px] font-mono text-gray-500 mt-2">ENTER ROOT CREDENTIALS</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-[10px] font-mono text-gray-500 uppercase flex justify-between">
                    <span>Admin_ID</span>
                    <span className="text-red-500/50">*REQUIRED</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-600 group-focus-within:text-red-500 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 py-3 pl-10 pr-3 text-sm text-white font-mono focus:border-red-500 focus:outline-none focus:bg-[#0c0c0c] transition-colors placeholder:text-gray-800"
                      placeholder="ADMIN@SYSTEM.LOC"
                    />
                    {/* Corner accent */}
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 group-focus-within:border-red-500 transition-colors"></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-[10px] font-mono text-gray-500 uppercase flex justify-between">
                    <span>Secure_Key</span>
                    <span className="text-red-500/50">*REQUIRED</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-600 group-focus-within:text-red-500 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#050505] border border-white/10 py-3 pl-10 pr-3 text-sm text-white font-mono focus:border-red-500 focus:outline-none focus:bg-[#0c0c0c] transition-colors placeholder:text-gray-800"
                      placeholder="••••••••••••"
                    />
                    {/* Corner accent */}
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 group-focus-within:border-red-500 transition-colors"></div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-white hover:bg-red-600 text-black hover:text-white font-bold text-sm uppercase py-3.5 transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? 'VERIFYING...' : 'INITIATE_DASHBOARD'}
                    {!isLoading && (
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="square" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                  </span>
                </button>
              </form>
            </div>

            {/* Module Footer */}
            <div className="px-8 py-3 bg-[#050505] border-t border-white/5 flex justify-between items-center">
               <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-[9px] font-mono text-red-500">SECURE_CONN</span>
               </div>
               <span className="text-[9px] font-mono text-gray-600">ENCRYPTION: 256-BIT</span>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
}