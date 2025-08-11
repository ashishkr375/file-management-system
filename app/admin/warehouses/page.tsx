'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Warehouse {
  id: string;
  name: string;
  notes?: string;
  createdAt: string;
}

interface ApiKey {
  key: string;
  warehouseId: string;
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
  size: number;
  mimeType: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

interface WarehouseWithDetails extends Warehouse {
  apiKey?: string;
  fileCount: number;
  totalSize: number;
  verifiedCount: number;
}

export default function WarehousesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [warehouses, setWarehouses] = useState<WarehouseWithDetails[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [warehouseFiles, setWarehouseFiles] = useState<File[]>([]);
  const [warehouseName, setWarehouseName] = useState('');
  const [notes, setNotes] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<File[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      const filteredFiles = files.filter(file => file.warehouseId === selectedWarehouse);
      setWarehouseFiles(filteredFiles);
    }
  }, [selectedWarehouse, files]);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        if (userData.role !== 'admin' && userData.role !== 'superadmin') {
          return;
        }
        setIsLoggedIn(true);
        loadData();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadData() {
    const loadingToast = toast.loading('Loading warehouses...');
    try {
      // Load warehouses
      const warehousesRes = await fetch('/api/admin/list-warehouses');
      let warehouseData: Warehouse[] = [];
      if (warehousesRes.ok) {
        const data = await warehousesRes.json();
        warehouseData = data.warehouses;
      } else {
        toast.error('Failed to load warehouses');
      }

      // Load API keys
      const apisRes = await fetch('/api/admin/list-apis');
      let apiKeys: ApiKey[] = [];
      if (apisRes.ok) {
        const data = await apisRes.json();
        apiKeys = data.apis;
      } else {
        toast.error('Failed to load API keys');
      }

      // Load files
      const filesRes = await fetch('/api/admin/list-files');
      let filesData: File[] = [];
      if (filesRes.ok) {
        const data = await filesRes.json();
        filesData = data.files;
        setFiles(filesData);
      } else {
        toast.error('Failed to load files');
      }

      // Combine data to create warehouse details
      const warehousesWithDetails: WarehouseWithDetails[] = warehouseData.map(warehouse => {
        const warehouseFiles = filesData.filter(file => file.warehouseId === warehouse.id);
        const apiKey = apiKeys.find(key => key.warehouseId === warehouse.id);
        
        return {
          ...warehouse,
          apiKey: apiKey?.key,
          fileCount: warehouseFiles.length,
          totalSize: warehouseFiles.reduce((sum, file) => sum + file.size, 0),
          verifiedCount: warehouseFiles.filter(file => file.isVerified).length
        };
      });

      setWarehouses(warehousesWithDetails);
      toast.dismiss(loadingToast);
      toast.success('Data loaded successfully');
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to load data');
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
        setShowCreateForm(false);
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

  async function deleteFile(fileId: string) {
    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;
    
    // Open the confirmation dialog with the selected file
    setFilesToDelete([fileToDelete]);
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
        // Update files in state
        const updatedFiles = files.map(f => 
          f.id === fileId ? { ...f, isVerified } : f
        );
        setFiles(updatedFiles);
        setWarehouseFiles(updatedFiles.filter(f => f.warehouseId === selectedWarehouse));
        
        // Update warehouse stats
        setWarehouses(warehouses.map(warehouse => {
          if (warehouse.id === selectedWarehouse) {
            return {
              ...warehouse,
              verifiedCount: isVerified 
                ? warehouse.verifiedCount + 1 
                : warehouse.verifiedCount - 1
            };
          }
          return warehouse;
        }));
        
        toast.success(isVerified ? 'File verified successfully' : 'File verification revoked');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update file verification status');
      }
    } catch (error) {
      console.error('Verify file failed:', error);
      toast.error('Failed to update file verification status');
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  function toggleFileSelection(fileId: string) {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  }
  
  function toggleSelectAll(filesToToggle: File[]) {
    if (selectedFiles.length === filesToToggle.length) {
      // If all are selected, unselect all
      setSelectedFiles([]);
    } else {
      // Otherwise, select all
      setSelectedFiles(filesToToggle.map(file => file.id));
    }
  }

  function handlePageChange(pageNumber: number) {
    setCurrentPage(pageNumber);
  }
  
  function handleItemsPerPageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  }

  async function deleteMultipleFiles() {
    if (selectedFiles.length === 0) {
      toast.error('No files selected for deletion');
      return;
    }
    
    // Get the full file objects for the selected file IDs
    const filesToDeleteList = files.filter(file => selectedFiles.includes(file.id));
    setFilesToDelete(filesToDeleteList);
    setShowDeleteDialog(true);
  }

  async function confirmDelete() {
    try {
      // Track successful and failed deletions
      let successCount = 0;
      let failCount = 0;
      
      // Process deletions sequentially to handle errors individually
      for (const file of filesToDelete) {
        try {
          const res = await fetch(`/api/user/files/${file.id}`, {
            method: 'DELETE'
          });
          
          if (res.ok) {
            successCount++;
          } else {
            const error = await res.json();
            console.error(`Failed to delete file ${file.originalName}:`, error);
            failCount++;
          }
        } catch (error) {
          console.error(`Error deleting file ${file.originalName}:`, error);
          failCount++;
        }
      }
      
      // Update UI based on results
      if (successCount > 0) {
        // Remove deleted files from the list
        setFiles(files.filter(f => !filesToDelete.map(fd => fd.id).includes(f.id)));
        // Clear selected files
        setSelectedFiles([]);
        // Refresh data
        loadData();
        
        if (failCount === 0) {
          toast.success(`Successfully deleted ${successCount} file${successCount !== 1 ? 's' : ''}`);
        } else {
          toast.success(`Successfully deleted ${successCount} file${successCount !== 1 ? 's' : ''}, but failed to delete ${failCount}`);
        }
      } else if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} file${failCount !== 1 ? 's' : ''}`);
      }
      
      // Close the dialog
      setShowDeleteDialog(false);
      setFilesToDelete([]);
      
    } catch (error) {
      console.error('Delete files failed:', error);
      toast.error('Failed to delete files. Please try again.');
      setShowDeleteDialog(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null; // Authentication is handled by layout
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto my-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Warehouse Management</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-blue-500 to-teal-400 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-teal-500 transition-all duration-200 text-sm font-medium shadow-sm"
            >
              {showCreateForm ? 'Cancel' : 'Create Warehouse'}
            </button>
          </div>
        </div>

        {/* Create Warehouse Form */}
        {showCreateForm && (
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
        )}

        {selectedWarehouse ? (
          // Warehouse detail view
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <button
                onClick={() => setSelectedWarehouse(null)}
                className="mr-3 text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back to Warehouses
              </button>
              <h2 className="text-2xl font-bold">
                {warehouses.find(w => w.id === selectedWarehouse)?.name}
              </h2>
            </div>

            {/* Warehouse Details */}
            <div className="bg-gradient-to-br from-white to-blue-50 p-8 rounded-xl shadow-sm border border-blue-100 transition-all hover:shadow-md">
              <h3 className="text-xl font-semibold text-blue-800 mb-6">Warehouse Information</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-2">ID</p>
                  <p className="font-mono text-slate-700">{selectedWarehouse}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-2">Created</p>
                  <p className="text-slate-700">{formatDate(warehouses.find(w => w.id === selectedWarehouse)?.createdAt || '')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-2">Notes</p>
                  <p className="text-slate-700">{warehouses.find(w => w.id === selectedWarehouse)?.notes || 'No notes'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-2">Files</p>
                  <p className="text-slate-700">{warehouses.find(w => w.id === selectedWarehouse)?.fileCount || 0} files 
                    ({formatBytes(warehouses.find(w => w.id === selectedWarehouse)?.totalSize || 0)})</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm text-gray-500">API Key</p>
                <div className="flex items-center mt-1">
                  <code className="bg-gray-100 p-2 rounded font-mono text-sm overflow-x-auto max-w-full flex-grow">
                    {warehouses.find(w => w.id === selectedWarehouse)?.apiKey || 'No API key found'}
                  </code>
                  <button
                    onClick={() => {
                      const apiKey = warehouses.find(w => w.id === selectedWarehouse)?.apiKey;
                      if (apiKey) {
                        navigator.clipboard.writeText(apiKey);
                        toast.success('API Key copied to clipboard');
                      }
                    }}
                    className="ml-2 p-2 text-blue-600 hover:text-blue-800"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Files Table */}
            <div className="bg-gradient-to-br from-white to-blue-50 p-8 rounded-xl shadow-sm border border-blue-100 transition-all hover:shadow-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-blue-800">Files in Warehouse</h3>
                {/* Table controls */}
                <div className="flex items-center">
                  <label className="text-sm text-gray-600 mr-2">Show:</label>
                  <select 
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="ml-2 text-sm text-gray-600">entries</span>
                </div>
              </div>

              {/* Bulk actions */}
              {selectedFiles.length > 0 && (
                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    {selectedFiles.length} files selected
                  </span>
                  <button
                    onClick={deleteMultipleFiles}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Delete Selected
                  </button>
                </div>
              )}
              
              {warehouseFiles.length > 0 ? (
                <>
                  <div className="overflow-x-auto border border-blue-100 rounded-lg shadow-sm bg-white">
                    <table className="min-w-full divide-y divide-blue-100 table-fixed">
                      <thead className="bg-gradient-to-r from-blue-50 to-white">
                        <tr>
                          <th scope="col" className="w-12 px-6 py-4">
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 w-4 h-4"
                                checked={selectedFiles.length === warehouseFiles.length}
                                onChange={() => toggleSelectAll(warehouseFiles)}
                              />
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left">
                            <div className="flex items-center">
                              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">File Name</span>
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left">
                            <div className="flex items-center">
                              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Size</span>
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left">
                            <div className="flex items-center">
                              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Uploaded</span>
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left">
                            <div className="flex items-center">
                              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Status</span>
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-4 text-left">
                            <div className="flex items-center">
                              <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Actions</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-blue-50">
                        {warehouseFiles
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((file) => (
                          <tr key={file.id} className="hover:bg-blue-50/50 transition-colors duration-150">
                            <td className="w-12 px-6 py-4">
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 transition-all duration-200 w-4 h-4"
                                  checked={selectedFiles.includes(file.id)}
                                  onChange={() => toggleFileSelection(file.id)}
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 truncate max-w-xs">{file.originalName}</span>
                                <span className="text-xs text-slate-500 font-mono truncate mt-0.5">{file.filename}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <span className="text-sm text-slate-700">{formatBytes(file.size)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm text-slate-700">{formatDate(file.uploadedAt)}</span>
                                <span className="text-xs text-slate-500 mt-0.5">by {file.uploader}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  file.isVerified 
                                    ? 'bg-green-100 text-green-800 border border-green-200' 
                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    file.isVerified ? 'bg-green-400' : 'bg-yellow-400'
                                  }`}></span>
                                  {file.isVerified ? 'Verified' : 'Pending'}
                                </span>
                                {file.verifiedBy && (
                                  <span className="text-xs text-slate-500 mt-1.5 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                    {file.verifiedBy} at {formatDate(file.verifiedAt || '')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => verifyFile(file.id, !file.isVerified)}
                                  className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                                    file.isVerified
                                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 focus:ring-yellow-400'
                                      : 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-400'
                                  } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                                >
                                  {file.isVerified ? (
                                    <>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                      Revoke
                                    </>
                                  ) : (
                                    <>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      Verify
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => deleteFile(file.id)}
                                  className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition-colors duration-200"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-700">
                      Showing {Math.min((currentPage - 1) * itemsPerPage + 1, warehouseFiles.length)} to{' '}
                      {Math.min(currentPage * itemsPerPage, warehouseFiles.length)} of {warehouseFiles.length} results
                    </div>
                    <div className="flex items-center space-x-2">
                      {Array.from(
                        { length: Math.ceil(warehouseFiles.length / itemsPerPage) },
                        (_, i) => i + 1
                      ).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm rounded ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No files found in this warehouse.
                </div>
              )}
            </div>
          </div>
        ) : (
          // Warehouse list view
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-sm border border-blue-100 overflow-hidden transition-all hover:shadow-md">
            <div className="px-6 py-5 border-b border-blue-100">
              <h2 className="text-xl font-semibold text-blue-800">Warehouses</h2>
              <p className="mt-1 text-sm text-blue-600">
                Manage all warehouses in the system
              </p>
            </div>
            
            <div className="divide-y divide-blue-100">
              {warehouses.map((warehouse) => (
                <div key={warehouse.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {warehouse.name}
                      </h3>
                      <div className="text-sm text-gray-500 mb-2">
                        {warehouse.id} • Created {formatDate(warehouse.createdAt)}
                      </div>
                      <div className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {warehouse.notes || 'No notes'}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-gray-500">Files</div>
                          <div className="text-xl font-semibold text-blue-600">{warehouse.fileCount}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-gray-500">Verified</div>
                          <div className="text-xl font-semibold text-green-600">{warehouse.verifiedCount}</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-gray-500">Total Size</div>
                          <div className="text-xl font-semibold text-purple-600">{formatBytes(warehouse.totalSize)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setSelectedWarehouse(warehouse.id)}
                      className="ml-4 px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
              
              {warehouses.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  No warehouses found. Create a warehouse to get started.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Deletion
            </h3>
            <div className="mb-5">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete the following {filesToDelete.length > 1 ? 'files' : 'file'}?
                This action cannot be undone.
              </p>
              
              <div className="mt-4 max-h-60 overflow-y-auto">
                {filesToDelete.map(file => (
                  <div key={file.id} className="flex items-center space-x-2 py-2 px-3 bg-gray-50 rounded mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700">{file.originalName}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setFilesToDelete([]);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700"
                onClick={confirmDelete}
              >
                {filesToDelete.length > 1 ? `Delete ${filesToDelete.length} Files` : 'Delete File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
