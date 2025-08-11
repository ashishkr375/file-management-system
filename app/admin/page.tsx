'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface ApiKey {
  key: string;
  warehouseId: string;
  warehouseName: string;
  createdAt: string;
}

interface File {
  id: string;
  filename: string;
  originalName: string;
  warehouseId: string;
  uploadedAt: string;
  uploader: string;
  isVerified: boolean;
}

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [warehouseName, setWarehouseName] = useState('');
  const [notes, setNotes] = useState('');
  const [apis, setApis] = useState<ApiKey[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        // Only set isLoggedIn if the user is an admin or superadmin
        if (userData.role === 'admin' || userData.role === 'superadmin') {
          setIsLoggedIn(true);
          loadData();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const loadingToast = toast.loading('Logging in...');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success('Login successful!');
        setIsLoggedIn(true);
        loadData();
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

  async function createWarehouse(e: React.FormEvent) {
    e.preventDefault();
    const loadingToast = toast.loading('Creating warehouse...');
    try {
      const res = await fetch('/api/admin/create-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseName, notes })
      });

      if (res.ok) {
        const data = await res.json();
        toast.dismiss(loadingToast);
        toast.success(`Warehouse created successfully!`);
        // Copy API key to clipboard
        navigator.clipboard.writeText(data.apiKey)
          .then(() => toast.success('API Key copied to clipboard'))
          .catch(() => {});
        setWarehouseName('');
        setNotes('');
        loadData();
      } else {
        const error = await res.json();
        toast.dismiss(loadingToast);
        toast.error(error.error || 'Failed to create warehouse');
      }
    } catch (error) {
      console.error('Create warehouse failed:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to create warehouse');
    }
  }

  async function loadData() {
    const loadingToast = toast.loading('Loading data...');
    try {
      // Load APIs
      const apisRes = await fetch('/api/admin/list-apis');
      if (apisRes.ok) {
        const data = await apisRes.json();
        setApis(data.apis);
      } else {
        console.error('Failed to load APIs');
      }
      
      toast.dismiss(loadingToast);
      toast.success('Data loaded successfully');
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to load dashboard data');
    }
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
          </div>
          
            {/* Create Warehouse Form */}
          <div className="bg-gradient-to-br from-white to-blue-50 p-8 rounded-xl shadow-sm border border-blue-100 mb-8 transition-all hover:shadow-md">
            <h2 className="text-xl font-semibold text-blue-800 mb-6 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Create New Warehouse
            </h2>
            <form onSubmit={createWarehouse} className="space-y-6">
            <div>
              <label htmlFor="warehouseName" className="block text-sm font-medium text-blue-700 mb-2">
              Warehouse Name
              </label>
              <input
              id="warehouseName"
              type="text"
              value={warehouseName}
              onChange={e => setWarehouseName(e.target.value)}
              placeholder="Enter warehouse name"
              className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white shadow-sm transition-all"
              required
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-blue-700 mb-2">
              Notes (optional)
              </label>
              <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any additional information about this warehouse"
              className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white shadow-sm transition-all"
              rows={3}
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-teal-400 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-200 font-medium shadow-sm flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Warehouse + Generate API Key
            </button>
            </form>
          </div>

        {/* API Keys Table */}
        <div className="bg-gradient-to-br from-white to-blue-50 p-8 rounded-xl shadow-lg mb-8 border border-blue-100/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-teal-400 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">API Keys</h2>
            </div>
            <div className="text-sm text-slate-500">{apis.length} Key{apis.length !== 1 ? 's' : ''} Total</div>
          </div>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border border-blue-100 md:rounded-xl bg-white/50 backdrop-blur-sm">
                <table className="min-w-full table-fixed divide-y divide-blue-100">
                  <thead className="bg-blue-50/50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider w-1/3">
                        API Key
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Warehouse
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Created At
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider w-1/4">
                        Public URL Base
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100/50 bg-white/50">
                    {apis.map(api => (
                      <tr key={api.key} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded-md truncate max-w-[200px]">
                              {api.key}
                            </code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(api.key);
                                toast.success('API Key copied to clipboard');
                              }}
                              className="ml-2 p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Copy to clipboard"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                            <span className="text-sm font-medium text-slate-700">{api.warehouseName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {new Date(api.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded-md truncate max-w-[180px]">
                              {`/api/files/${api.warehouseId}/`}
                            </code>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`/api/files/${api.warehouseId}/`);
                                toast.success('URL path copied to clipboard');
                              }}
                              className="ml-2 p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Copy to clipboard"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {apis.length === 0 && (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-slate-700">No API Keys Found</h3>
              <p className="mt-2 text-sm text-slate-500">Create a warehouse to generate your first API key.</p>
            </div>
          )}
        </div>

       
      </div>
    </div>
  );
}
