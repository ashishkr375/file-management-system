'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

// --- TYPES ---
interface User {
  role: string;
  name?: string;
  email?: string;
}

interface ApiKey {
  key: string;
  warehouseId: string;
  warehouseName: string;
  createdAt: string;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null); 
  const [warehouseName, setWarehouseName] = useState('');
  const [notes, setNotes] = useState('');
  const [apis, setApis] = useState<ApiKey[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/v2/me', { credentials: 'include' });
      if (res.ok) {
        const userData = await res.json();
        if (userData.role === 'admin' || userData.role === 'superadmin') {
          setIsLoggedIn(true);
          setUser(userData);
          loadData();
        } else {
          window.location.href = '/admin/login';
        }
      } else {
         window.location.href = '/admin/login';
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = '/admin/login';
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsLoggedIn(false);
      setUser(null);
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout failed', error);
    }
  }

  async function createWarehouse(e: React.FormEvent) {
    e.preventDefault();
    const loadingToast = toast.loading('INITIALIZING WAREHOUSE CREATION...');
    try {
      const res = await fetch('/api/admin/create-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseName, notes }),
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        toast.dismiss(loadingToast);
        toast.success(`WAREHOUSE DEPLOYED: ${warehouseName}`);
        
        navigator.clipboard.writeText(data.apiKey)
          .then(() => toast.success('API KEY COPIED TO CLIPBOARD'))
          .catch(() => toast.error('CLIPBOARD ACCESS DENIED'));

        setWarehouseName('');
        setNotes('');
        loadData();
      } else {
        const error = await res.json();
        toast.dismiss(loadingToast);
        toast.error(error.error || 'DEPLOYMENT FAILED');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('SYSTEM ERROR: CREATION HALTED');
    }
  }

  async function loadData() {
    setIsLoadingData(true);
    try {
      const apisRes = await fetch('/api/admin/list-apis', { credentials: 'include' });
      if (apisRes.ok) {
        const data = await apisRes.json();
        setApis(data.apis);
      }
      setIsLoadingData(false);
    } catch (error) {
      toast.error('DATA FETCH ERROR');
      setIsLoadingData(false);
    }
  }

  if (!isLoggedIn) return null; 

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-blue-500 selection:text-black flex flex-col relative">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none fixed"></div>

      {/* --- ADMIN HEADER --- */}
      {isLoggedIn && (
        <header className="bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              
              {/* Left: Logo & Title */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 flex items-center justify-center text-white font-bold font-mono shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <Link href="/admin" className="text-lg font-bold text-white uppercase tracking-wider hover:text-blue-500 transition-colors">
                    Admin_Portal
                  </Link>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    SECURE_SESSION_ACTIVE
                  </div>
                </div>
              </div>
              
              {/* Right: Navigation & Profile */}
              <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-1">
                  <Link 
                    href="/admin"
                    className="px-4 py-2 text-xs font-mono text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all uppercase tracking-wide"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/admin/users"
                    className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all uppercase tracking-wide"
                  >
                    Manage_Users
                  </Link>
                  <Link 
                    href="/admin/warehouses"
                    className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all uppercase tracking-wide"
                  >
                    Manage_Warehouses
                  </Link>
                </div>
                
                {/* User Profile & Logout */}
                {user && (
                  <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-white uppercase">
                        {user.name || (user.email ? user.email.split('@')[0] : 'Admin')}
                      </div>
                      <div className="text-[10px] font-mono text-blue-500 uppercase">
                        {user.role}
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="flex items-center justify-center w-9 h-9 bg-[#0a0a0a] border border-white/20 hover:border-red-500 hover:text-red-500 text-gray-400 transition-all duration-300 group"
                      title="TERMINATE SESSION"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-grow max-w-7xl mx-auto p-6 w-full relative z-10 space-y-12">
        
        {/* 1. CREATE WAREHOUSE SECTION */}
        <section>
           <div className="flex items-center gap-2 mb-6">
              <span className="text-blue-500 font-mono text-xs uppercase tracking-widest">// DEPLOY_NEW_UNIT</span>
              <div className="h-px flex-grow bg-gradient-to-r from-blue-900/50 to-transparent"></div>
           </div>

           <div className="bg-[#0a0a0a] border border-white/10 relative overflow-hidden group">
              <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600"></div>
              
              <div className="p-8">
                 <div className="flex items-start gap-6">
                    <div className="hidden md:flex w-12 h-12 border border-white/10 items-center justify-center text-blue-500 bg-[#050505]">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="square" strokeWidth="1.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                    </div>
                    <div className="flex-grow">
                       <h2 className="text-xl font-bold text-white uppercase mb-1">Initialize Warehouse</h2>
                       <p className="text-xs font-mono text-gray-500 mb-6">CONFIGURE NEW STORAGE ALLOCATION UNIT. API KEYS GENERATED AUTOMATICALLY.</p>
                       
                       <form onSubmit={createWarehouse} className="space-y-6">
                          <div className="grid md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label htmlFor="warehouseName" className="text-[10px] font-mono text-gray-500 uppercase">Unit_Designation (Name)</label>
                                <input
                                   id="warehouseName"
                                   type="text"
                                   value={warehouseName}
                                   onChange={e => setWarehouseName(e.target.value)}
                                   placeholder="EX: PROD_ASSETS_V1"
                                   className="w-full bg-[#050505] border border-white/10 p-3 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition-colors placeholder:text-gray-800"
                                   required
                                />
                             </div>
                             <div className="space-y-2">
                                <label htmlFor="notes" className="text-[10px] font-mono text-gray-500 uppercase">Manifest_Notes (Optional)</label>
                                <input
                                   id="notes"
                                   value={notes}
                                   onChange={e => setNotes(e.target.value)}
                                   placeholder="METADATA / DESCRIPTION"
                                   className="w-full bg-[#050505] border border-white/10 p-3 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition-colors placeholder:text-gray-800"
                                />
                             </div>
                          </div>
                          
                          <button
                             type="submit"
                             className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase py-3 px-8 tracking-wider transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center gap-2"
                          >
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="square" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                             </svg>
                             EXECUTE_DEPLOYMENT
                          </button>
                       </form>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* 2. API KEYS TABLE */}
        <section>
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                 <span className="text-blue-500 font-mono text-xs uppercase tracking-widest">// ACTIVE_KEYS_REGISTRY</span>
                 <div className="h-px w-12 bg-blue-900/50"></div>
              </div>
              <div className="text-[10px] font-mono text-gray-500">TOTAL_ENTRIES: {apis.length}</div>
           </div>

           <div className="bg-[#0a0a0a] border border-white/10 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/10 bg-[#0f0f0f] text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                 <div className="col-span-4 md:col-span-3">API_KEY_HASH</div>
                 <div className="col-span-4 md:col-span-3">WAREHOUSE_ID</div>
                 <div className="col-span-4 md:col-span-2">CREATED_TIMESTAMP</div>
                 <div className="hidden md:block col-span-4">PUBLIC_ENDPOINT</div>
              </div>

              {isLoadingData ? (
                 <div className="p-12 flex flex-col items-center justify-center text-blue-500">
                    <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mb-4"></div>
                    <span className="text-xs font-mono animate-pulse">FETCHING_DATA_STREAM...</span>
                 </div>
              ) : apis.length === 0 ? (
                 <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto border border-white/10 flex items-center justify-center bg-[#050505] mb-4 text-gray-700">
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="square" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                       </svg>
                    </div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase">Registry Empty</h3>
                    <p className="text-[10px] font-mono text-gray-600 mt-1">NO ACTIVE API KEYS DETECTED</p>
                 </div>
              ) : (
                 <div className="divide-y divide-white/5">
                    {apis.map((api, idx) => (
                       <motion.div 
                          key={api.key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/5 transition-colors group"
                       >
                          {/* API Key Column */}
                          <div className="col-span-4 md:col-span-3 flex items-center gap-2 overflow-hidden">
                             <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></div>
                             <code className="text-xs font-mono text-white bg-[#050505] px-2 py-1 border border-white/10 truncate w-full">
                                {api.key}
                             </code>
                             <button 
                                onClick={() => {
                                   navigator.clipboard.writeText(api.key);
                                   toast.success('KEY COPIED');
                                }}
                                className="text-gray-500 hover:text-blue-500 transition-colors"
                                title="COPY"
                             >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                             </button>
                          </div>

                          {/* Warehouse Name */}
                          <div className="col-span-4 md:col-span-3 text-xs font-bold text-gray-300 uppercase truncate">
                             {api.warehouseName}
                          </div>

                          {/* Date */}
                          <div className="col-span-4 md:col-span-2 text-[10px] font-mono text-gray-500">
                             {new Date(api.createdAt).toLocaleDateString()} <span className="text-gray-700">|</span> {new Date(api.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>

                          {/* Endpoint URL */}
                          <div className="hidden md:flex col-span-4 items-center gap-2 overflow-hidden">
                             <code className="text-[10px] font-mono text-gray-500 truncate">
                                /api/files/{api.warehouseId}/
                             </code>
                             <button 
                                onClick={() => {
                                   navigator.clipboard.writeText(`/api/files/${api.warehouseId}/`);
                                   toast.success('ENDPOINT COPIED');
                                }}
                                className="text-gray-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                             >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                             </button>
                          </div>
                       </motion.div>
                    ))}
                 </div>
              )}
           </div>
        </section>

      </main>
    </div>
  );
}