'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPE DEFINITIONS ---
interface FileData {
  id: string;
  filename: string;
  originalName: string;
  warehouseId: string;
  uploadedAt: string;
  uploader: string;
  isVerified: boolean;
  size: number;
  mimeType?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

interface Warehouse {
  id: string;
  name: string;
  notes?: string;
  createdAt: string;
  apiKey?: string;
  fileCount: number;
  totalSize: number;
  verifiedCount: number;
}

interface ApiKey {
  key: string;
  warehouseId: string;
  warehouseName: string;
  createdAt: string;
}

interface User {
  role: string;
  name?: string;
  email?: string;
}

export default function WarehousesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Typed States
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [warehouseFiles, setWarehouseFiles] = useState<FileData[]>([]);
  
  // Forms
  const [warehouseName, setWarehouseName] = useState('');
  const [notes, setNotes] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Pagination & Selection
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  // Delete States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<FileData[]>([]);
  const [deleteWarehouseState, setDeleteWarehouseState] = useState({
    show: false, 
    warehouseId: null as string | null, 
    warehouseName: '', 
    confirmText: ''
  });

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      const filtered = files.filter(file => file.warehouseId === selectedWarehouse);
      setWarehouseFiles(filtered);
      setCurrentPage(1);
      setSelectedFiles([]);
    }
  }, [selectedWarehouse, files]);

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
    const loadingToast = toast.loading('SYNCING_WAREHOUSE_DATA...');
    try {
      const [whRes, apiRes, filesRes] = await Promise.all([
        fetch('/api/admin/list-warehouses'),
        fetch('/api/admin/list-apis'),
        fetch('/api/admin/list-files')
      ]);

      if (whRes.ok && apiRes.ok && filesRes.ok) {
        const whData = await whRes.json();
        const apiData = await apiRes.json();
        const fileData = await filesRes.json();

        setFiles(fileData.files);

        const combinedData = whData.warehouses.map((wh: any) => {
          const whFiles = fileData.files.filter((f: FileData) => f.warehouseId === wh.id);
          const apiKey = apiData.apis.find((k: ApiKey) => k.warehouseId === wh.id);
          return {
            ...wh,
            apiKey: apiKey?.key,
            fileCount: whFiles.length,
            totalSize: whFiles.reduce((sum: number, f: FileData) => sum + f.size, 0),
            verifiedCount: whFiles.filter((f: FileData) => f.isVerified).length
          };
        });
        setWarehouses(combinedData);
        toast.dismiss(loadingToast);
        toast.success('DATA_SYNC_COMPLETE');
      } else {
        toast.error('DATA_SYNC_FAILED');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('NETWORK_ERROR');
    }
  }

  // --- ACTIONS ---
  async function createWarehouse(e: React.FormEvent) {
    e.preventDefault();
    const toastId = toast.loading('INITIALIZING_UNIT...');
    try {
      const res = await fetch('/api/admin/create-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseName, notes })
      });

      if (res.ok) {
        const data = await res.json();
        toast.dismiss(toastId);
        toast.success('UNIT_DEPLOYED');
        navigator.clipboard.writeText(data.apiKey);
        setWarehouseName(''); setNotes(''); setShowCreateForm(false);
        loadData();
      } else {
        toast.dismiss(toastId);
        toast.error('DEPLOYMENT_FAILED');
      }
    } catch (e) { toast.dismiss(toastId); toast.error('SYSTEM_ERROR'); }
  }

  async function deleteFile(fileId: string) {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    setFilesToDelete([file]);
    setShowDeleteDialog(true);
  }

  async function verifyFile(fileId: string, isVerified: boolean) {
    try {
      const res = await fetch('/api/admin/verify-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, isVerified })
      });
      if (res.ok) {
        const updated = files.map(f => f.id === fileId ? { ...f, isVerified } : f);
        setFiles(updated);
        // Manually update warehouse stats in UI
        setWarehouses(prev => prev.map(wh => {
           if (wh.id === selectedWarehouse) {
              return { ...wh, verifiedCount: isVerified ? wh.verifiedCount + 1 : wh.verifiedCount - 1 };
           }
           return wh;
        }));
        toast.success(isVerified ? 'FILE_VERIFIED' : 'VERIFICATION_REVOKED');
      } else { toast.error('STATUS_UPDATE_FAILED'); }
    } catch (e) { toast.error('NETWORK_ERROR'); }
  }

  async function confirmDelete() {
    let success = 0, fail = 0;
    for (const file of filesToDelete) {
      try {
        const res = await fetch(`/api/user/files/${file.id}`, { method: 'DELETE' });
        if (res.ok) success++; else fail++;
      } catch (e) { fail++; }
    }
    
    if (success > 0) {
      setFiles(prev => prev.filter(f => !filesToDelete.find(fd => fd.id === f.id)));
      setSelectedFiles([]);
      toast.success(`PURGED ${success} FILES`);
      // Update warehouse stats
      setWarehouses(prev => prev.map(wh => {
         if(wh.id === selectedWarehouse) {
            const deletedSize = filesToDelete.reduce((acc, f) => acc + f.size, 0);
            return { ...wh, fileCount: wh.fileCount - success, totalSize: wh.totalSize - deletedSize };
         }
         return wh;
      }));
    }
    if (fail > 0) toast.error(`FAILED TO PURGE ${fail} FILES`);
    
    setShowDeleteDialog(false);
    setFilesToDelete([]);
  }

  async function deleteWarehouse() {
    if (deleteWarehouseState.confirmText !== 'confirm delete') return toast.error('CONFIRMATION_MISMATCH');
    const toastId = toast.loading('DECOMMISSIONING_UNIT...');
    try {
      const whFiles = files.filter(f => f.warehouseId === deleteWarehouseState.warehouseId);
      for(const f of whFiles) { await fetch(`/api/user/files/${f.id}`, { method: 'DELETE' }); }

      await fetch(`/api/admin/warehouses/${deleteWarehouseState.warehouseId}`, { method: 'DELETE' });
      
      setDeleteWarehouseState({ show: false, warehouseId: null, warehouseName: '', confirmText: '' });
      toast.dismiss(toastId);
      toast.success('UNIT_DECOMMISSIONED');
      
      if (selectedWarehouse === deleteWarehouseState.warehouseId) setSelectedWarehouse(null);
      loadData();
    } catch (e) { toast.dismiss(toastId); toast.error('DECOMMISSION_FAILED'); }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const formatDate = (str: string) => new Date(str).toLocaleDateString() + ' ' + new Date(str).toLocaleTimeString();
  
  const toggleFileSelection = (id: string) => setSelectedFiles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    const currentPageFiles = warehouseFiles.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);
    setSelectedFiles(prev => prev.length === currentPageFiles.length ? [] : currentPageFiles.map(f => f.id));
  };

  if (isLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-blue-500 font-mono">INITIALIZING_SYSTEM...</div>;
  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-blue-500 selection:text-black flex flex-col relative">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none fixed"></div>

      {/* --- ADMIN HEADER --- */}
      <header className="bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-8xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 flex items-center justify-center text-white font-bold font-mono shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
              </div>
              <div className="flex flex-col">
                <Link href="/admin" className="text-lg font-bold text-white uppercase tracking-wider hover:text-blue-500 transition-colors">Admin_Portal</Link>
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> SECURE_SESSION_ACTIVE</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-1">
                <Link href="/admin" className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all uppercase tracking-wide">Dashboard</Link>
                <Link href="/admin/users" className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all uppercase tracking-wide">Manage_Users</Link>
                <Link href="/admin/warehouses" className="px-4 py-2 text-xs font-mono text-white bg-white/5 border border-white/10 transition-all uppercase tracking-wide">Manage_Warehouses</Link>
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
        
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Warehouse_Control</h1>
            <p className="text-xs font-mono text-gray-500">STORAGE_ALLOCATION // FILE_MANIFESTS</p>
          </div>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all">
            {showCreateForm ? 'CANCEL_OP' : 'DEPLOY_NEW_UNIT'}
          </button>
        </div>

        {/* CREATE FORM */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden">
              <div className="bg-[#0a0a0a] border border-white/10 p-6 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-500"></div>
                <h2 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-500"></span> Initialize Unit</h2>
                <form onSubmit={createWarehouse} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Unit_Designation</label>
                    <input value={warehouseName} onChange={e => setWarehouseName(e.target.value)} className="w-full bg-[#050505] border border-white/10 p-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none" placeholder="WAREHOUSE_NAME" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Manifest_Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-[#050505] border border-white/10 p-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none" rows={2} placeholder="DESCRIPTION" />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase py-3">EXECUTE_DEPLOYMENT</button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedWarehouse ? (
          // --- SELECTED WAREHOUSE VIEW ---
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedWarehouse(null)} className="text-blue-500 hover:text-white text-xs font-mono uppercase flex items-center gap-1">
                ← RETURN_TO_GRID
              </button>
              <div className="h-4 w-px bg-white/10"></div>
              <h2 className="text-xl font-bold text-white uppercase">{warehouses.find(w => w.id === selectedWarehouse)?.name}</h2>
            </div>

            {/* INFO PANEL */}
            <div className="bg-[#0a0a0a] border border-white/10 p-6 relative overflow-hidden">
              <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Unit_Parameters</h3>
                <button onClick={() => setDeleteWarehouseState({ show: true, warehouseId: selectedWarehouse, warehouseName: warehouses.find(w => w.id === selectedWarehouse)?.name || '', confirmText: '' })} className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 text-[10px] font-bold uppercase hover:bg-red-500 hover:text-white transition-colors">
                  DECOMMISSION_UNIT
                </button>
              </div>
              
              <div className="grid md:grid-cols-4 gap-6 text-[10px] font-mono">
                <div>
                  <span className="text-gray-500 block mb-1">UNIT_ID</span>
                  <span className="text-white bg-[#151515] px-2 py-1 border border-white/10">{selectedWarehouse}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">CREATION_TIMESTAMP</span>
                  <span className="text-white">{formatDate(warehouses.find(w => w.id === selectedWarehouse)?.createdAt || '')}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">TOTAL_STORAGE</span>
                  <span className="text-blue-400">{formatBytes(warehouses.find(w => w.id === selectedWarehouse)?.totalSize || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">FILE_COUNT</span>
                  <span className="text-white">{warehouses.find(w => w.id === selectedWarehouse)?.fileCount}</span>
                </div>
              </div>
              
              <div className="mt-4">
                 <span className="text-[10px] font-mono text-gray-500 block mb-1">API_ACCESS_KEY</span>
                 <code className="block w-full bg-[#050505] border border-white/10 p-2 text-xs text-green-500 font-mono break-all">
                    {warehouses.find(w => w.id === selectedWarehouse)?.apiKey || 'KEY_NOT_FOUND'}
                 </code>
              </div>
            </div>

            {/* FILES TABLE */}
            <div className="bg-[#0a0a0a] border border-white/10">
              <div className="px-6 py-4 border-b border-white/10 bg-[#0f0f0f] flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">File_Manifest</h3>
                <div className="flex gap-4 items-center">
                   {selectedFiles.length > 0 && (
                      <button onClick={() => { setFilesToDelete(warehouseFiles.filter(f => selectedFiles.includes(f.id))); setShowDeleteDialog(true); }} className="text-red-500 text-xs font-bold uppercase hover:text-white">
                         PURGE_SELECTED ({selectedFiles.length})
                      </button>
                   )}
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-mono">VIEW_LIMIT:</span>
                      <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-[#050505] border border-white/10 text-[10px] text-white p-1 outline-none">
                         <option value="10">10</option><option value="25">25</option><option value="50">50</option>
                      </select>
                   </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#050505] text-[10px] font-mono text-gray-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 w-10"><input type="checkbox" className="bg-transparent border-white/20" onChange={toggleSelectAll} checked={selectedFiles.length > 0 && selectedFiles.length === warehouseFiles.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage).length} /></th>
                      <th className="px-6 py-3 font-normal">Filename</th>
                      <th className="px-6 py-3 font-normal">Size</th>
                      <th className="px-6 py-3 font-normal">Uploader</th>
                      <th className="px-6 py-3 font-normal">Verification</th>
                      <th className="px-6 py-3 font-normal text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs font-mono text-gray-300">
                    {warehouseFiles.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage).map(file => (
                      <tr key={file.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-3"><input type="checkbox" checked={selectedFiles.includes(file.id)} onChange={() => toggleFileSelection(file.id)} className="bg-transparent border-white/20" /></td>
                        <td className="px-6 py-3">
                           <div className="font-bold text-white truncate max-w-[200px]">{file.originalName}</div>
                           <div className="text-[9px] text-gray-600 truncate max-w-[200px]">{file.filename}</div>
                        </td>
                        <td className="px-6 py-3 text-blue-400">{formatBytes(file.size)}</td>
                        <td className="px-6 py-3">
                           <div>{file.uploader}</div>
                           <div className="text-[9px] text-gray-600">{formatDate(file.uploadedAt)}</div>
                        </td>
                        <td className="px-6 py-3">
                           <span className={`px-2 py-0.5 border text-[9px] uppercase ${file.isVerified ? 'border-green-500/30 text-green-500 bg-green-500/5' : 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5'}`}>
                              {file.isVerified ? 'VERIFIED' : 'PENDING'}
                           </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => verifyFile(file.id, !file.isVerified)} className={`text-[9px] font-bold uppercase hover:text-white ${file.isVerified ? 'text-yellow-500' : 'text-green-500'}`}>
                                 {file.isVerified ? 'REVOKE' : 'VERIFY'}
                              </button>
                              <button onClick={() => deleteFile(file.id)} className="text-[9px] font-bold uppercase text-red-500 hover:text-white">
                                 PURGE
                              </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                    {warehouseFiles.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-600">// EMPTY_MANIFEST</td></tr>}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {warehouseFiles.length > 0 && (
                 <div className="px-6 py-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-gray-500">
                       DISPLAYING {Math.min((currentPage-1)*itemsPerPage+1, warehouseFiles.length)} - {Math.min(currentPage*itemsPerPage, warehouseFiles.length)} OF {warehouseFiles.length}
                    </span>
                    <div className="flex gap-1">
                       {Array.from({length: Math.ceil(warehouseFiles.length/itemsPerPage)}, (_, i) => i+1).map(p => (
                          <button key={p} onClick={() => setCurrentPage(p)} className={`w-6 h-6 flex items-center justify-center text-[10px] font-mono border ${currentPage===p ? 'border-blue-500 text-blue-500' : 'border-white/10 text-gray-500 hover:border-white/30'}`}>
                             {p}
                          </button>
                       ))}
                    </div>
                 </div>
              )}
            </div>
          </div>
        ) : (
          // --- GRID VIEW ---
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {warehouses.map(wh => (
              <div key={wh.id} onClick={() => setSelectedWarehouse(wh.id)} className="bg-[#0a0a0a] border border-white/10 p-6 hover:border-blue-500/50 transition-colors cursor-pointer group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <h3 className="text-lg font-bold text-white uppercase group-hover:text-blue-500 transition-colors">{wh.name}</h3>
                      <span className="text-[9px] font-mono text-gray-600">{wh.id}</span>
                   </div>
                   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                
                <p className="text-xs text-gray-400 mb-6 h-8 line-clamp-2 font-mono">{wh.notes || '// NO_NOTES'}</p>
                
                <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                   <div className="text-center border-r border-white/5">
                      <span className="block text-[10px] text-gray-500 mb-1">FILES</span>
                      <span className="text-white font-bold">{wh.fileCount}</span>
                   </div>
                   <div className="text-center border-r border-white/5">
                      <span className="block text-[10px] text-gray-500 mb-1">SIZE</span>
                      <span className="text-blue-400 font-bold">{formatBytes(wh.totalSize)}</span>
                   </div>
                   <div className="text-center">
                      <span className="block text-[10px] text-gray-500 mb-1">OK</span>
                      <span className="text-green-500 font-bold">{wh.verifiedCount}</span>
                   </div>
                </div>
              </div>
            ))}
            {warehouses.length === 0 && (
               <div className="col-span-full py-12 text-center border border-dashed border-white/10">
                  <span className="text-gray-600 font-mono text-sm">// NO_ACTIVE_UNITS_DETECTED</span>
               </div>
            )}
          </div>
        )}
      </main>

      {/* --- MODALS (Delete & Confirm) --- */}
      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#0a0a0a] border border-white/10 w-full max-w-md shadow-2xl p-6">
              <h3 className="text-white font-bold uppercase mb-4 text-sm flex items-center gap-2"><span className="text-red-500">⚠</span> Confirm_Purge_Protocol</h3>
              <div className="max-h-40 overflow-y-auto bg-[#050505] p-2 mb-4 border border-white/5">
                 {filesToDelete.map(f => <div key={f.id} className="text-[10px] font-mono text-gray-400 mb-1">&gt; {f.originalName}</div>)}
              </div>
              <div className="flex justify-end gap-3">
                 <button onClick={() => { setShowDeleteDialog(false); setFilesToDelete([]); }} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-white">Abort</button>
                 <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-500">Execute_Purge</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {deleteWarehouseState.show && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-[#0a0a0a] border border-red-500/50 w-full max-w-md shadow-[0_0_30px_rgba(239,68,68,0.2)] p-6">
              <h3 className="text-red-500 font-bold uppercase mb-4 text-sm">⚠ Critical: Decommission Unit</h3>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                 This action will permanently destroy warehouse <span className="text-white font-bold">{deleteWarehouseState.warehouseName}</span> and all contained data assets. This cannot be undone.
              </p>
              <div className="mb-4">
                 <label className="block text-[9px] font-mono text-gray-500 uppercase mb-1">Type 'confirm delete' to proceed</label>
                 <input type="text" value={deleteWarehouseState.confirmText} onChange={e => setDeleteWarehouseState({...deleteWarehouseState, confirmText: e.target.value})} className="w-full bg-[#050505] border border-red-900/50 text-red-500 p-2 text-sm font-mono focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3">
                 <button onClick={() => setDeleteWarehouseState({show: false, warehouseId: null, warehouseName: '', confirmText: ''})} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase hover:text-white">Cancel</button>
                 <button onClick={deleteWarehouse} disabled={deleteWarehouseState.confirmText !== 'confirm delete'} className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed">Decommission</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}