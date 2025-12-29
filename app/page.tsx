'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // FIXED: Added Type Annotation 'React.FormEvent'
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/auth/v2/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (res.ok) {
        setTimeout(() => {
          window.location.href = '/user/dashboard';
        }, 500);
      } else {
        const data = await res.json();
        setError(data.error || 'ACCESS_DENIED');
        setIsLoading(false);
      }
    } catch (err) {
      setError('SYSTEM_ERROR: CONNECTION_REFUSED');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-orange-500 selection:text-black flex flex-col relative overflow-hidden">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      {/* Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-24 bg-orange-500/10 blur-[100px] pointer-events-none"></div>

      {/* --- HEADER --- */}
      <header className="border-b border-white/10 bg-[#050505]/80 backdrop-blur-md relative z-50">
        <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 flex items-center justify-center text-black font-bold font-mono">
              FS
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-white uppercase tracking-wider leading-none">
                File_Sys
              </h1>
              <span className="text-[10px] font-mono text-gray-500">VER 2.0 // SECURE_STORAGE</span>
            </div>
          </div>
          
          <Link 
            href="/admin/login" 
            className="group flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-orange-500/50 bg-[#0a0a0a] transition-all duration-300"
          >
            <span className="w-1.5 h-1.5 bg-gray-500 group-hover:bg-orange-500 rounded-none transition-colors" />
            <span className="text-xs font-mono text-gray-400 group-hover:text-white uppercase tracking-wider">
              Admin_Console
            </span>
          </Link>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-grow flex items-center justify-center py-12 px-4 relative z-10">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* LEFT: SYSTEM INFO */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-1 border border-orange-500/30 bg-orange-500/5 mb-4">
                <span className="w-1.5 h-1.5 bg-orange-500 animate-pulse"></span>
                <span className="text-[10px] font-mono text-orange-500 uppercase">System_Online</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white uppercase tracking-tight leading-none mb-4">
                Secure <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-600">
                  Architecture
                </span>
              </h2>
              <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-md border-l border-white/10 pl-4">
                Enterprise-grade storage solution utilizing localized S3-compatible warehousing protocols.
              </p>
            </div>

            {/* Feature Modules */}
            <div className="grid sm:grid-cols-2 gap-4">
              <FeatureModule 
                title="Warehouse_Logic" 
                desc="Categorized file organization"
                icon={<path d="M3 3h18v18H3zM5 5v14h14V5z M7 7h10v2H7z M7 11h10v2H7z M7 15h10v2H7z" />}
              />
              <FeatureModule 
                title="Auto_Verify" 
                desc="SHA-256 Integrity Check"
                icon={<path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />}
              />
              <FeatureModule 
                title="Signed_URLs" 
                desc="Time-limited Access Tokens"
                icon={<path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />}
              />
              <FeatureModule 
                title="API_Gateway" 
                desc="Programmatic Integration"
                icon={<path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />}
              />
            </div>
          </motion.div>

          {/* RIGHT: LOGIN TERMINAL */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            
            <div className="relative bg-[#0a0a0a] border border-white/10 p-1">
              <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f0f] border-b border-white/5">
                <span className="text-[10px] font-mono text-gray-500">USER_AUTH_PROTOCOL</span>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/10" />
                  <div className="w-2 h-2 bg-white/10" />
                  <div className="w-2 h-2 bg-orange-500" />
                </div>
              </div>

              <div className="p-8">
                <div className="mb-8 text-center">
                  <div className="w-12 h-12 mx-auto border border-white/10 flex items-center justify-center bg-[#050505] mb-4 text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="square" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-widest">Identify Yourself</h3>
                  <p className="text-[10px] font-mono text-gray-600 mt-1">ENTER CREDENTIALS TO PROCEED</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-red-500/10 border-l-2 border-red-500 p-3"
                    >
                      <p className="text-xs font-mono text-red-500 flex items-center gap-2">
                        <span>[!]</span> {error}
                      </p>
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Access_ID</label>
                    <div className="relative group">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-[#050505] border border-white/10 p-3 text-sm text-white font-mono focus:border-orange-500 focus:outline-none focus:bg-[#0c0c0c] transition-colors pl-10"
                        placeholder="USER@DOMAIN.LOC"
                        required
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-orange-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="square" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Passcode</label>
                    <div className="relative group">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#050505] border border-white/10 p-3 text-sm text-white font-mono focus:border-orange-500 focus:outline-none focus:bg-[#0c0c0c] transition-colors pl-10"
                        placeholder="••••••••••••"
                        required
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-orange-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="square" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-orange-500 text-black font-bold text-sm uppercase py-3.5 transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isLoading ? 'Authenticating...' : 'Establish Connection'}
                      {!isLoading && (
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="square" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      )}
                    </span>
                  </button>
                </form>
              </div>
              
              <div className="px-4 py-2 bg-[#0f0f0f] border-t border-white/5 flex justify-between text-[9px] font-mono text-gray-600">
                 <span>ENCRYPTION: AES-256</span>
                 <span>PORT: 443</span>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/10 bg-[#050505] relative z-10">
        <div className="max-w-7xl mx-auto py-6 px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          
          {/* Copyright & Domain */}
          <div className="text-[10px] font-mono text-gray-500 flex flex-col md:flex-row items-center gap-2 md:gap-3">
            <span className="uppercase">© {new Date().getFullYear()} Ashish Kumar</span>
            <span className="hidden md:block text-white/10">|</span>
            <a 
              href="https://www.ashishk.online/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-orange-500 transition-colors uppercase tracking-wide border-b border-transparent hover:border-orange-500"
            >
              www.ashishk.online
            </a>
            <span className="hidden md:block text-white/10">|</span>
            <span className="uppercase">All Rights Reserved</span>
          </div>

          {/* Social Links */}
          <div className="flex gap-6 text-[10px] font-mono text-gray-500">
            <a href="https://github.com/ashishkr375" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">[GITHUB]</a>
            <a href="https://www.linkedin.com/in/ashish-kumar-nitp" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">[LINKEDIN]</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- SUB-COMPONENT: FEATURE MODULE ---
// FIXED: Added interface for props
interface FeatureModuleProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const FeatureModule = ({ title, desc, icon }: FeatureModuleProps) => (
  <div className="group border border-white/10 bg-[#0a0a0a] p-4 hover:border-orange-500/50 transition-colors duration-300">
    <div className="w-8 h-8 text-gray-500 group-hover:text-orange-500 transition-colors mb-3">
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
        {icon}
      </svg>
    </div>
    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 group-hover:text-orange-500 transition-colors">
      {title}
    </h3>
    <p className="text-[10px] font-mono text-gray-500">
      // {desc}
    </p>
  </div>
);