'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileUpload } from '../../components/ui/file-upload';
import { Toaster, toast } from 'react-hot-toast';

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
}

interface Warehouse {
  id: string;
  name: string;
  apiKey: string;
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [activeWarehouse, setActiveWarehouse] = useState<string>('all');
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    verifiedFiles: 0
  });
  const [warehouseStats, setWarehouseStats] = useState<{[key: string]: {
    totalFiles: number;
    totalSize: number;
    verifiedFiles: number;
  }}>({});
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [baseUrl] = useState(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Multiple selection state
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]); 
  
  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<File[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadWarehouses();
    }
  }, [user]);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/v2/me', {
        credentials: 'include'
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        loadFiles();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadWarehouses() {
    try {
      // Use the new API endpoint that handles permissions correctly
      const res = await fetch('/api/user/warehouses');
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data.warehouses);
      } else {
        console.error('Failed to load warehouses');
      }
    } catch (error) {
      console.error('Failed to load warehouses:', error);
      // Fallback if the API fails
      if (user?.warehouseIds) {
        const warehouseIds = user.warehouseIds;
        const userWarehouses = warehouseIds.map((id: string) => ({
          id,
          name: `Warehouse ${id}`,
          apiKey: ''
        }));
        setWarehouses(userWarehouses);
      }
    }
  }

  async function loadFiles() {
    try {
      const res = await fetch('/api/user/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
        
        // Calculate overall stats
        const total = data.files.length;
        const totalBytes = data.files.reduce((sum: number, file: File) => sum + file.size, 0);
        const verified = data.files.filter((f: File) => f.isVerified).length;
        
        setStats({
          totalFiles: total,
          totalSize: totalBytes,
          verifiedFiles: verified
        });
        
        // Calculate per-warehouse stats
        const warehouseStatsObj: {[key: string]: {
          totalFiles: number;
          totalSize: number;
          verifiedFiles: number;
        }} = {};
        
        // Group files by warehouse
        const filesByWarehouse: {[key: string]: File[]} = {};
        data.files.forEach((file: File) => {
          if (!filesByWarehouse[file.warehouseId]) {
            filesByWarehouse[file.warehouseId] = [];
          }
          filesByWarehouse[file.warehouseId].push(file);
        });
        
        // Calculate stats for each warehouse
        Object.keys(filesByWarehouse).forEach(warehouseId => {
          const warehouseFiles = filesByWarehouse[warehouseId];
          const warehouseTotal = warehouseFiles.length;
          const warehouseBytes = warehouseFiles.reduce((sum: number, file: File) => sum + file.size, 0);
          const warehouseVerified = warehouseFiles.filter((f: File) => f.isVerified).length;
          
          warehouseStatsObj[warehouseId] = {
            totalFiles: warehouseTotal,
            totalSize: warehouseBytes,
            verifiedFiles: warehouseVerified
          };
        });
        
        setWarehouseStats(warehouseStatsObj);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  
  function toggleSelectAll(filteredFiles: File[]) {
    if (selectedFiles.length === filteredFiles.length) {
      // If all are selected, unselect all
      setSelectedFiles([]);
    } else {
      // Otherwise, select all
      setSelectedFiles(filteredFiles.map(file => file.id));
    }
  }
  
  // Handle pagination change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  }
  
  // Handle items per page change
  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  }

  async function getSignedUrl(warehouseId: string, filename: string) {
    try {
      const res = await fetch('/api/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          warehouseId,
          filename,
          expiresIn: 3600 // 1 hour
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        const fullUrl = `${baseUrl}${data.signedUrl}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(fullUrl);
        toast.success('URL copied to clipboard!');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        
        // Also offer to open the URL
        if (confirm('Would you like to open it in a new tab?')) {
          window.open(fullUrl, '_blank');
        }
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to get signed URL');
      }
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      toast.error('Failed to get signed URL. Please try again.');
    }
  }

  async function deleteFile(fileId: string) {
    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;
    
    // Open the confirmation dialog with the selected file
    setFilesToDelete([fileToDelete]);
    setShowDeleteDialog(true);
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
            method: 'DELETE',
            credentials: 'include'
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
        // Refresh stats
        loadFiles();
        
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-right" />
      
      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">File Management Dashboard</h1>
          {/* Warehouse Selector */}
          {warehouses.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold mb-4">Your Warehouses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div 
                  onClick={() => setActiveWarehouse('all')}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    activeWarehouse === 'all' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">All Warehouses</div>
                  <div className="text-sm text-gray-500 mt-1">View files from all warehouses</div>
                  <div className="mt-2 text-xs font-medium text-blue-600">
                    {stats.totalFiles} files ({formatBytes(stats.totalSize)})
                  </div>
                </div>
                
                {warehouses.map(warehouse => (
                  <div 
                    key={warehouse.id}
                    onClick={() => setActiveWarehouse(warehouse.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition ${
                      activeWarehouse === warehouse.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{warehouse.name}</div>
                    <div className="text-sm text-gray-500 mt-1 truncate">{warehouse.id}</div>
                    <div className="mt-2 text-xs font-medium text-blue-600">
                      {warehouseStats[warehouse.id]?.totalFiles || 0} files ({formatBytes(warehouseStats[warehouse.id]?.totalSize || 0)})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Files</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {activeWarehouse === 'all' 
                  ? stats.totalFiles 
                  : warehouseStats[activeWarehouse]?.totalFiles || 0}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Storage</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {activeWarehouse === 'all' 
                  ? formatBytes(stats.totalSize) 
                  : formatBytes(warehouseStats[activeWarehouse]?.totalSize || 0)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Verified Files</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {activeWarehouse === 'all' 
                  ? `${stats.verifiedFiles} / ${stats.totalFiles}` 
                  : `${warehouseStats[activeWarehouse]?.verifiedFiles || 0} / ${warehouseStats[activeWarehouse]?.totalFiles || 0}`}
              </div>
            </div>
          </div>
          
          {/* File Upload */}
          {activeWarehouse !== 'all' && (
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <h2 className="text-xl font-semibold mb-4">Upload File to {warehouses.find(w => w.id === activeWarehouse)?.name || `Warehouse ${activeWarehouse}`}</h2>
              
              <FileUpload 
                warehouseId={activeWarehouse}
                multiple={true}
                onSubmit={async (formData) => {
                  try {
                    console.log('Dashboard: Submitting file upload');
                    
                    // Log FormData contents for debugging
                    console.log('FormData entries from dashboard:');
                    for (const pair of formData.entries()) {
                      console.log(`${pair[0]}: ${typeof pair[1] === 'object' ? 'File object' : pair[1]}`);
                    }
                    
                    const uploadResponse = await fetch('/api/upload', {
                      method: 'POST',
                      body: formData,
                    });
                    
                    // Get the response text first (works whether it's JSON or not)
                    const responseText = await uploadResponse.text();
                    console.log('Raw response from server:', responseText);
                    
                    // Try to parse it as JSON
                    let data;
                    try {
                      data = JSON.parse(responseText);
                    } catch (e) {
                      console.error('Failed to parse response as JSON:', e);
                      toast.error('Invalid server response');
                      throw new Error('Invalid server response');
                    }
                    
                    if (!uploadResponse.ok) {
                      toast.error(data.error || 'Failed to upload file');
                      throw new Error(data.error || 'Failed to upload file');
                    }
                    
                    console.log('Dashboard upload response:', data);
                    
                    // Refresh the file list
                    loadFiles();
                    
                    // Show success toast with file count
                    if (data.count > 1) {
                      toast.success(`Successfully uploaded ${data.count} files!`);
                    } else {
                      toast.success('File uploaded successfully!');
                    }
                    
                    return data;
                  } catch (err) {
                    console.error('Upload failed:', err);
                    toast.error('Upload failed. Please try again.');
                    throw err;
                  }
                }}
              />
            </div>
          )}

          {/* Files Table */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {activeWarehouse === 'all' 
                  ? 'Your Files' 
                  : `Files in ${warehouses.find(w => w.id === activeWarehouse)?.name || `Warehouse ${activeWarehouse}`}`}
              </h2>
            </div>
            
            {/* File access notification */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Files uploaded with a valid API key are automatically verified. All files can be accessed via a secure signed URL that expires after 1 hour.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Table controls */}
            <div className="flex justify-between mb-4">
              <div className="flex items-center">
                <label className="text-sm text-gray-600 mr-2">Show:</label>
                <select 
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="ml-2 text-sm text-gray-600">entries</span>
              </div>
              
              {/* Bulk actions */}
              <div className="flex items-center">
                {selectedFiles.length > 0 && (
                  <button
                    onClick={deleteMultipleFiles}
                    className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 flex items-center mr-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Delete Selected ({selectedFiles.length})
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 w-10">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        onChange={() => {
                          const filteredFiles = files.filter(
                            file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse
                          );
                          toggleSelectAll(filteredFiles);
                        }}
                        checked={
                          files.filter(file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse).length > 0 &&
                          selectedFiles.length === files.filter(file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse).length
                        }
                      />
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      File Name
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Size
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Uploaded
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Warehouse
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {files.length > 0 ? (
                    files
                      .filter(file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse)
                      // Apply pagination
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((file) => (
                      <tr key={file.id} className={selectedFiles.includes(file.id) ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <input 
                            type="checkbox" 
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            checked={selectedFiles.includes(file.id)}
                            onChange={() => toggleFileSelection(file.id)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.originalName}</div>
                          <div className="text-xs text-gray-500 font-mono truncate max-w-xs">{file.filename}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">{formatBytes(file.size)}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">{file.mimeType}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900">{new Date(file.uploadedAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(file.uploadedAt).toLocaleTimeString()}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 truncate">
                            {warehouses.find(w => w.id === file.warehouseId)?.name || `Warehouse ${file.warehouseId}`}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            file.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {file.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => getSignedUrl(file.warehouseId, file.filename)}
                              className="px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex items-center"
                              aria-label="Get URL"
                              title="Get URL"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                              </svg>
                              <span className="hidden sm:inline">{isCopied ? 'Copied!' : 'Get URL'}</span>
                            </button>
                            <button
                              onClick={() => deleteFile(file.id)}
                              className="px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 flex items-center"
                              aria-label="Delete file"
                              title="Delete file"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        No files found. Upload your first file!
                      </td>
                    </tr>
                  )}
                  {files.length > 0 && files.filter(file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        No files found in this warehouse.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {files.filter(file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse).length > 0 && (
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {Math.min(
                      (currentPage - 1) * itemsPerPage + 1,
                      files.filter(file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse).length
                    )}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(
                      currentPage * itemsPerPage,
                      files.filter(file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse).length
                    )}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">
                    {files.filter(file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse).length}
                  </span>{' '}
                  results
                </div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border ${
                      currentPage === 1 
                        ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {Array.from({ length: Math.ceil(files.filter(file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse).length / itemsPerPage) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handlePageChange(index + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border ${
                        currentPage === index + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === Math.ceil(files.filter(file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse).length / itemsPerPage)}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border ${
                      currentPage === Math.ceil(files.filter(file => activeWarehouse === 'all' || file.warehouseId === activeWarehouse).length / itemsPerPage)
                        ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </main>

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
                  <div key={file.id} className="p-3 border border-gray-200 rounded-md mb-2">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {file.originalName}
                        </h4>
                        <div className="mt-1 text-xs text-gray-500">
                          <p>Size: {formatBytes(file.size)}</p>
                          <p>Type: {file.mimeType}</p>
                          <p>Uploaded: {new Date(file.uploadedAt).toLocaleString()}</p>
                          <p>Warehouse: {warehouses.find(w => w.id === file.warehouseId)?.name || file.warehouseId}</p>
                        </div>
                      </div>
                    </div>
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
