'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';

interface UserData {
  id: string;
  email: string;
  role: string;
}

interface TestResponse {
  success?: boolean;
  error?: string;
  fileId?: string;
  filename?: string;
  url?: string;
  signedUrl?: string;
  [key: string]: any;
}

export default function TestPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  // Test form state
  const [apiEndpoint, setApiEndpoint] = useState('/api/upload');
  const [apiKey, setApiKey] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [warehouseId, setWarehouseId] = useState('');
  const [filename, setFilename] = useState('');
  const [customOriginalName, setCustomOriginalName] = useState('');
  const [expiresIn, setExpiresIn] = useState('3600');
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<TestResponse | null>(null);
  const [responseType, setResponseType] = useState<'json' | 'file'>('json');
  const [downloadUrl, setDownloadUrl] = useState('');

  // Test history
  const [testHistory, setTestHistory] = useState<{
    endpoint: string;
    response: TestResponse;
    timestamp: Date;
  }[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/v2/me', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFilename(selectedFile.name);
      
      // Clear custom original name if it was empty or matches the previous file's name
      if (!customOriginalName || customOriginalName === filename) {
        setCustomOriginalName('');
      }
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsTesting(true);
    setTestResponse(null);
    setDownloadUrl('');
    
    const testingToast = toast.loading('Testing API...');
    
    try {
      let response;
      let responseData: TestResponse;
      
      if (apiEndpoint === '/api/upload') {
        // File upload endpoint
        if (!file) {
          toast.dismiss(testingToast);
          toast.error('Please select a file to upload');
          setIsTesting(false);
          return;
        }
        
        // Make sure warehouse ID is provided for upload
        if (!warehouseId) {
          toast.dismiss(testingToast);
          toast.error('Warehouse ID is required for upload');
          setIsTesting(false);
          return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('warehouseId', warehouseId);
        
        // If custom original name is provided, add it to the form data
        if (customOriginalName) {
          formData.append('originalName', customOriginalName);
        }
        
        // Using fetch with XMLHttpRequest to properly handle the upload with headers
        const xhr = new XMLHttpRequest();
        
        const uploadPromise = new Promise<any>((resolve, reject) => {
          xhr.open('POST', '/api/upload');
          xhr.setRequestHeader('X-API-Key', apiKey); // Set API key header directly
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data);
              } catch (err) {
                reject(new Error('Invalid server response'));
              }
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.error || `Upload failed: ${xhr.status}`));
              } catch (err) {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            }
          };
          
          xhr.onerror = () => {
            reject(new Error('Network error during upload'));
          };
          
          xhr.send(formData);
        });
        
        try {
          responseData = await uploadPromise;
        } catch (error: any) {
          console.error('Upload error:', error);
          responseData = { error: error.message };
        }
        
        setResponseType('json');
        
      } else if (apiEndpoint === '/api/signed-url') {
        // Signed URL endpoint
        response = await fetch('/api/signed-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify({
            warehouseId,
            filename,
            expiresIn: parseInt(expiresIn),
          }),
        });
        
        responseData = await response.json();
        
        if (responseData.signedUrl) {
          // Check if we received a properly formatted URL
          console.log('Received signedUrl:', responseData.signedUrl);
          
          // If the URL already has the base (http/https), use it directly
          if (responseData.signedUrl.startsWith('http')) {
            setDownloadUrl(responseData.signedUrl);
            console.log('Using absolute URL:', responseData.signedUrl);
          } else {
            // For relative URLs (starting with /), just use it as-is
            // The browser will resolve it correctly against the current origin
            setDownloadUrl(responseData.signedUrl);
            console.log('Using relative URL (browser will resolve):', responseData.signedUrl);
          }
        }
        
        setResponseType('json');
      } else if (apiEndpoint.startsWith('/api/files/')) {
        // Direct file access endpoint
        response = await fetch(apiEndpoint, {
          headers: {
            'X-API-Key': apiKey,
          },
        });
        
        // Check if response is a file or JSON
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
          setResponseType('json');
        } else {
          // It's a file, create object URL for download
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setDownloadUrl(url);
          
          // Create a simple response object for display
          responseData = {
            success: response.ok,
            status: response.status,
            contentType: contentType || 'unknown',
            contentLength: blob.size,
          };
          
          setResponseType('file');
        }
      } else {
        // Generic endpoint
        response = await fetch(apiEndpoint, {
          headers: {
            'X-API-Key': apiKey,
          },
        });
        
        responseData = await response.json();
        setResponseType('json');
      }
      
      // Add to history
      setTestHistory(prev => [
        {
          endpoint: apiEndpoint,
          response: responseData,
          timestamp: new Date(),
        },
        ...prev.slice(0, 4), // Keep only last 5 tests
      ]);
      
      setTestResponse(responseData);
      
      toast.dismiss(testingToast);
      toast.success('API test completed');
    } catch (error) {
      console.error('API test failed:', error);
      toast.dismiss(testingToast);
      toast.error('API test failed');
      
      setTestResponse({
        error: 'Failed to fetch. Check the console for details.',
      });
    } finally {
      setIsTesting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null; // Will redirect via useEffect
  }

  return (
    <div>
      <Toaster position="top-right" />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">API Testing Tool</h1>
        {/* Info Alert */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>File Access Update:</strong> All files uploaded with a valid API key are now automatically verified.
                Both verified and unverified files can be accessed via a signed URL.
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Test Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test API Endpoint</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="endpoint" className="block text-sm font-medium text-gray-700 mb-1">
                  API Endpoint
                </label>
                <select
                  id="endpoint"
                  value={apiEndpoint}
                  onChange={(e) => {
                    setApiEndpoint(e.target.value);
                    setTestResponse(null);
                    setDownloadUrl('');
                  }}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="/api/upload">File Upload</option>
                  <option value="/api/signed-url">Get Signed URL</option>
                  <option value={`/api/files/${warehouseId}/${filename}`}>Access File</option>
                  <option value="/api/user/files">List My Files</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  id="apiKey"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  required
                />
              </div>
              
              {apiEndpoint === '/api/upload' && (
                <>
                  <div>
                    <label htmlFor="warehouseId" className="block text-sm font-medium text-gray-700 mb-1">
                      Warehouse ID
                    </label>
                    <input
                      id="warehouseId"
                      type="text"
                      value={warehouseId}
                      onChange={(e) => setWarehouseId(e.target.value)}
                      placeholder="Enter warehouse ID"
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                      File to Upload
                    </label>
                    <input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="customOriginalName" className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Original Name (Optional)
                    </label>
                    <input
                      id="customOriginalName"
                      type="text"
                      value={customOriginalName}
                      onChange={(e) => setCustomOriginalName(e.target.value)}
                      placeholder="Enter custom original name"
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      If left empty, the original filename will be used
                    </p>
                  </div>
                </>
              )}
              
              {(apiEndpoint === '/api/signed-url' || apiEndpoint.startsWith('/api/files/')) && (
                <>
                  <div>
                    <label htmlFor="warehouseId" className="block text-sm font-medium text-gray-700 mb-1">
                      Warehouse ID
                    </label>
                    <input
                      id="warehouseId"
                      type="text"
                      value={warehouseId}
                      onChange={(e) => {
                        setWarehouseId(e.target.value);
                        if (apiEndpoint.startsWith('/api/files/')) {
                          setApiEndpoint(`/api/files/${e.target.value}/${filename}`);
                        }
                      }}
                      placeholder="Enter warehouse ID"
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-1">
                      Filename
                    </label>
                    <input
                      id="filename"
                      type="text"
                      value={filename}
                      onChange={(e) => {
                        setFilename(e.target.value);
                        if (apiEndpoint.startsWith('/api/files/')) {
                          setApiEndpoint(`/api/files/${warehouseId}/${e.target.value}`);
                        }
                      }}
                      placeholder="Enter filename"
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </>
              )}
              
              {apiEndpoint === '/api/signed-url' && (
                <div>
                  <label htmlFor="expiresIn" className="block text-sm font-medium text-gray-700 mb-1">
                    Expires In (seconds)
                  </label>
                  <input
                    id="expiresIn"
                    type="number"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    min="60"
                    max="86400"
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Min: 60 seconds, Max: 86400 seconds (24 hours)
                  </p>
                </div>
              )}
              
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isTesting}
                  className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isTesting ? 'Testing...' : 'Test API'}
                </button>
              </div>
            </form>
          </div>
          
          {/* Response Display */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">API Response</h2>
            
            {testResponse ? (
              <div className="space-y-4">
                {responseType === 'json' ? (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                        {JSON.stringify(testResponse, null, 2)}
                      </pre>
                    </div>
                    
                    {downloadUrl && (
                      <div className="text-center">
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                          onClick={(e) => {
                            // Add a click handler to log and check the URL
                            console.log('Opening URL:', downloadUrl);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Download File
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm"><strong>Status:</strong> {testResponse.success ? 'Success' : 'Failed'}</p>
                      <p className="text-sm"><strong>Content Type:</strong> {testResponse.contentType}</p>
                      <p className="text-sm"><strong>Size:</strong> {formatBytes(testResponse.contentLength)}</p>
                    </div>
                    
                    <div className="text-center">
                      <a
                        href={downloadUrl}
                        download={filename}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                        onClick={(e) => {
                          // Add a click handler to log and check the URL
                          console.log('Opening URL for download:', downloadUrl);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Download File
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500">
                <p>Test an API endpoint to see the response</p>
              </div>
            )}
            
            {/* Test History */}
            {testHistory.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-3">Recent Tests</h3>
                <div className="space-y-3">
                  {testHistory.map((test, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md text-sm">
                      <div className="flex justify-between">
                        <div className="font-medium text-gray-700">{test.endpoint}</div>
                        <div className="text-gray-500">{new Date(test.timestamp).toLocaleTimeString()}</div>
                      </div>
                      <div className="mt-1 text-gray-600">
                        {test.response.success
                          ? 'Success'
                          : test.response.error
                            ? `Error: ${test.response.error}`
                            : 'Response received'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
