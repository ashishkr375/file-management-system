'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES ---
interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  warehouseIds?: string[];
}

interface Warehouse {
  id: string;
  name: string;
}

export default function UserManagementPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [editWarehouses, setEditWarehouses] = useState<string[]>([]);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/v2/me', { credentials: 'include' });
      if (res.ok) {
        const userData = await res.json();
        if (['superadmin', 'admin'].includes(userData.role)) {
          setIsLoggedIn(true);
          setUser(userData);
          loadData();
        } else { window.location.href = '/admin/login'; }
      } else { window.location.href = '/admin/login'; }
    } catch (error) { console.error('Auth check failed:', error); } 
    finally { setIsLoading(false); }
  }

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/admin/login'; } 
    catch (error) { console.error('Logout failed', error); }
  }

  async function loadData() {
    try {
      const usersRes = await fetch('/api/admin/list-users');
      const whRes = await fetch('/api/admin/list-warehouses');
      
      if (usersRes.ok && whRes.ok) {
        const userData = await usersRes.json();
        const whData = await whRes.json();
        setUsers(userData.users);
        setWarehouses(whData.warehouses);
      } else {
        toast.error('DATA_FETCH_ERROR');
      }
    } catch (error) {
      toast.error('SYSTEM_FAILURE');
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return toast.error('CREDENTIALS_MISSING');
    
    const loadingToast = toast.loading('CREATING_USER_NODE...');
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role, warehouseIds: selectedWarehouses.length > 0 ? selectedWarehouses : undefined })
      });

      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success('USER_NODE_INITIALIZED');
        setEmail(''); setPassword(''); setName(''); setRole('user'); setSelectedWarehouses([]);
        loadData();
      } else {
        const err = await res.json();
        toast.dismiss(loadingToast);
        toast.error(err.error || 'CREATION_FAILED');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('NETWORK_ERROR');
    }
  }

  async function updateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    const loadingToast = toast.loading('UPDATING_REGISTRY...');
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editEmail, name: editName, role: editRole, warehouseIds: editWarehouses.length > 0 ? editWarehouses : undefined })
      });
      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success('REGISTRY_UPDATED');
        setEditingUser(null);
        loadData();
      } else {
        toast.dismiss(loadingToast);
        toast.error('UPDATE_FAILED');
      }
    } catch (e) { toast.dismiss(loadingToast); toast.error('SYSTEM_ERROR'); }
  }

  async function deleteUser(userId: string) {
    if (!confirm('CONFIRM DELETION PROTOCOL? THIS ACTION IS IRREVERSIBLE.')) return;
    const loadingToast = toast.loading('PURGING_DATA...');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success('USER_PURGED');
        loadData();
      } else {
        toast.dismiss(loadingToast);
        toast.error('PURGE_FAILED');
      }
    } catch (e) { toast.dismiss(loadingToast); toast.error('SYSTEM_ERROR'); }
  }

  function startEditing(user: User) {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditName(user.name || '');
    setEditRole(user.role);
    setEditWarehouses(user.warehouseIds || []);
  }

  function handleWarehouseSelection(e: React.ChangeEvent<HTMLSelectElement>, isNewUser: boolean) {
    const options = Array.from(e.target.selectedOptions).map(o => o.value);
    isNewUser ? setSelectedWarehouses(options) : setEditWarehouses(options);
  }

  if (isLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-blue-500 font-mono">INITIALIZING_DASHBOARD...</div>;
  if (!isLoggedIn) return null;

  const visibleUsers = users.filter(u => u.id !== 'sys-0a1b2c3d4e5f6g7h8i9j');

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-blue-500 selection:text-black flex flex-col relative">
      
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none fixed"></div>

      {/* --- HEADER --- */}
      <header className="bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-8xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Left: Logo */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 flex items-center justify-center text-white font-bold font-mono shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
              </div>
              <div className="flex flex-col">
                <Link href="/admin" className="text-lg font-bold text-white uppercase tracking-wider hover:text-blue-500 transition-colors">Admin_Portal</Link>
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> SECURE_SESSION_ACTIVE</div>
              </div>
            </div>
            
            {/* Right: Nav */}
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-1">
                <Link href="/admin" className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all uppercase tracking-wide">Dashboard</Link>
                <Link href="/admin/users" className="px-4 py-2 text-xs font-mono text-white bg-white/5 border border-white/10 transition-all uppercase tracking-wide">Manage_Users</Link>
                <Link href="/admin/warehouses" className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all uppercase tracking-wide">Manage_Warehouses</Link>
              </div>
              {user && (
                <div className="flex items-center gap-4 pl-6 border-l border-white/10">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-white uppercase">{user.name || 'Admin'}</div>
                    <div className="text-[10px] font-mono text-blue-500 uppercase">{user.role}</div>
                  </div>
                  <button onClick={handleLogout} className="w-9 h-9 bg-[#0a0a0a] border border-white/20 flex items-center justify-center hover:border-red-500 hover:text-red-500 transition-colors"><svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-8xl mx-auto py-8 px-4 sm:px-12 lg:px-28 relative z-10 w-full">
        
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white uppercase tracking-wider">User_Management</h1>
              <p className="text-xs font-mono text-gray-500">ACCESS_CONTROL // PERMISSIONS_MATRIX</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-[#0a0a0a] border border-white/10 text-xs font-mono text-gray-400">
            TOTAL_NODES: <span className="text-white font-bold">{visibleUsers.length}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: CREATE USER MODULE */}
          <div className="lg:col-span-1">
            <div className="bg-[#0a0a0a] border border-white/10 relative overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-blue-600 to-cyan-500"></div>
              <div className="p-6">
                <h2 className="text-sm font-bold text-white uppercase mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500"></span>
                  Register New User
                </h2>
                
                <form onSubmit={createUser} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Full_Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#050505] border border-white/10 p-2.5 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition-colors" placeholder="JOHN_DOE" />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Email_Address</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#050505] border border-white/10 p-2.5 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition-colors" required placeholder="USER@SYSTEM.LOC" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#050505] border border-white/10 p-2.5 text-sm text-white font-mono focus:border-blue-500 focus:outline-none transition-colors" required placeholder="••••••••" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Access_Level</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-[#050505] border border-white/10 p-2.5 text-sm text-white font-mono focus:border-blue-500 focus:outline-none">
                      <option value="user">STANDARD_USER</option>
                      <option value="admin">ADMINISTRATOR</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Warehouse_Assignment</label>
                    <select multiple size={3} className="w-full bg-[#050505] border border-white/10 p-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none scrollbar-thin" onChange={(e) => handleWarehouseSelection(e, true)} value={selectedWarehouses}>
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id} className="p-1 hover:bg-blue-900/30 cursor-pointer">{wh.name}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-gray-600 mt-1 font-mono">CTRL+CLICK TO SELECT MULTIPLE</p>
                  </div>

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase py-3 tracking-wider transition-all flex items-center justify-center gap-2 mt-4">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    INITIALIZE_USER
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* RIGHT: USER LIST */}
          <div className="lg:col-span-2">
            <div className="bg-[#0a0a0a] border border-white/10 h-full flex flex-col">
              <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-[#0f0f0f]">
                <h2 className="text-xs font-bold text-white uppercase tracking-widest">Registered_Entities</h2>
                <div className="flex gap-1"><div className="w-2 h-2 bg-white/10"></div><div className="w-2 h-2 bg-white/10"></div><div className="w-2 h-2 bg-blue-500"></div></div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-mono text-gray-500 uppercase bg-[#050505] border-b border-white/10">
                      <th className="px-6 py-3 font-normal">Identity</th>
                      <th className="px-6 py-3 font-normal">Clearance</th>
                      <th className="px-6 py-3 font-normal">Allocations</th>
                      <th className="px-6 py-3 font-normal text-right">Commands</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {visibleUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#151515] border border-white/10 flex items-center justify-center text-white font-bold text-xs">
                              {user.name ? user.name.charAt(0) : user.email.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white">{user.name || 'UNK_USER'}</div>
                              <div className="text-[10px] font-mono text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-mono px-2 py-1 border ${user.role === 'admin' || user.role === 'superadmin' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-white/10 text-gray-400 bg-white/5'}`}>
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.warehouseIds && user.warehouseIds.length > 0 ? (
                              user.warehouseIds.map(id => {
                                const warehouse = warehouses.find(w => w.id === id);
                                return warehouse ? <span key={id} className="text-[9px] px-1.5 py-0.5 bg-[#151515] border border-white/10 text-gray-400">{warehouse.name}</span> : null;
                              })
                            ) : <span className="text-[9px] text-gray-600 italic">NO_DATA</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {user.role !== 'superadmin' && (
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditing(user)} className="text-blue-500 hover:text-white transition-colors" title="EDIT"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                              <button onClick={() => deleteUser(user.id)} className="text-red-500 hover:text-white transition-colors" title="DELETE"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {visibleUsers.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-[10px] font-mono text-gray-600">// DATABASE_EMPTY</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#0f0f0f] border border-white/10 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#151515]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Modify_User_Record</h3>
                <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              
              <form onSubmit={updateUser} className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase">Identity</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-[#050505] border border-white/10 p-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase">Contact_Point</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full bg-[#050505] border border-white/10 p-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase">Clearance</label>
                  <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full bg-[#050505] border border-white/10 p-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-gray-500 uppercase">Allocations</label>
                  <select multiple size={3} value={editWarehouses} onChange={e => handleWarehouseSelection(e, false)} className="w-full bg-[#050505] border border-white/10 p-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none">
                    {warehouses.map((wh) => <option key={wh.id} value={wh.id}>{wh.name}</option>)}
                  </select>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white uppercase">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase">Commit_Changes</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}