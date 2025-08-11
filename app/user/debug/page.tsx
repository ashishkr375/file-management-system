'use client';

import { useState, useEffect } from 'react';

export default function SessionDebugPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [warehouse, setWarehouse] = useState<string>('');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [cookies, setCookies] = useState<string>('');
  const [loginEmail, setLoginEmail] = useState<string>('araash375@gmail.com');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginStatus, setLoginStatus] = useState<string | null>(null);

  useEffect(() => {
    // Display all cookies for debugging
    setCookies(document.cookie);
    
    async function checkSession() {
      try {
        console.log('Checking session with /api/auth/v2/me...');
        
        const response = await fetch('/api/auth/v2/me', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store', // Prevent caching
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Session check failed: ${response.status} ${errorText}`);
          throw new Error(`Failed to check session: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('Session data:', data);
        setUser(data);
        
        // Get user's warehouses
        if (data && data.warehouseIds && data.warehouseIds.length > 0) {
          setWarehouse(data.warehouseIds[0]);
          
          try {
            const warehousesResponse = await fetch('/api/user/warehouses', {
              credentials: 'include',
              cache: 'no-store', // Prevent caching
            });
            
            if (warehousesResponse.ok) {
              const warehousesData = await warehousesResponse.json();
              setWarehouses(warehousesData.warehouses || []);
            }
          } catch (error) {
            console.error('Error fetching warehouses:', error);
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  const testUpload = async () => {
    setUploadStatus('Uploading...');
    setUploadResult(null);
    
    try {
      // Create a simple test FormData
      const formData = new FormData();
      
      // Create a small text file
      const testFile = new File(['test content from session debug page'], 'session-test.txt', { 
        type: 'text/plain' 
      });
      
      formData.append('file', testFile);
      formData.append('warehouseId', warehouse);
      
      console.log('Testing upload with FormData:', formData);
      console.log('Selected warehouse:', warehouse);
      console.log('Current cookies:', document.cookie);
      
      // Log all form data entries
      for (const [key, value] of formData.entries()) {
        console.log(`FormData entry - ${key}: ${value instanceof File ? `File: ${value.name}` : value}`);
      }
      
      // Make the request with credentials included
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        cache: 'no-store', // Prevent caching
      });
      
      // Log the response details
      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', Object.fromEntries([...response.headers.entries()]));
      
      const responseText = await response.text();
      console.log('Upload response text:', responseText);
      
      try {
        const responseData = JSON.parse(responseText);
        setUploadResult(responseData);
        setUploadStatus(response.ok ? 'Upload successful!' : `Upload failed: ${responseData.error}`);
      } catch (e) {
        setUploadStatus(`Failed to parse response: ${responseText}`);
      }
    } catch (err) {
      console.error('Upload test error:', err);
      setUploadStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    // Refresh cookies display
    setCookies(document.cookie);
  };
  
  const manualLogin = async () => {
    setLoginStatus('Logging in...');
    try {
      const response = await fetch('/api/auth/v2/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
        credentials: 'include',
        cache: 'no-store', // Prevent caching
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setLoginStatus('Login successful!');
        // Refresh session data
        const sessionResponse = await fetch('/api/auth/v2/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setUser(sessionData);
          
          if (sessionData && sessionData.warehouseIds && sessionData.warehouseIds.length > 0) {
            setWarehouse(sessionData.warehouseIds[0]);
          }
        }
        
        // Refresh cookies display
        setCookies(document.cookie);
      } else {
        setLoginStatus(`Login failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return <div className="p-6">Loading session data...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Session Debug Page</h1>
      
      {error ? (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
          <p>Error: {error}</p>
        </div>
      ) : user ? (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded mb-6">
          <p className="font-semibold">You are logged in as:</p>
          <pre className="mt-2 p-3 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      ) : (
        <div>
          <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded mb-4">
            <p>You are not logged in. Please log in below or use the <a href="/login" className="underline">login page</a>.</p>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-300 rounded mb-6">
            <h2 className="text-xl font-bold mb-4">Debug Login</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              <button 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={manualLogin}
              >
                Login for Debugging
              </button>
              {loginStatus && (
                <div className={`mt-2 p-2 rounded ${loginStatus.includes('successful') ? 'bg-green-100' : 'bg-red-100'}`}>
                  {loginStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {user && (
        <>
          <h2 className="text-xl font-bold mt-8 mb-4">Test Upload with Session Authentication</h2>
          <div className="p-4 bg-blue-50 border border-blue-300 rounded">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Warehouse
              </label>
              <select 
                value={warehouse} 
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                {user.warehouseIds && user.warehouseIds.map((id: string) => (
                  <option key={id} value={id}>
                    {id} {warehouses.find(w => w.id === id)?.name ? `- ${warehouses.find(w => w.id === id)?.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={testUpload}
              disabled={!warehouse}
            >
              Test Upload with Session
            </button>
            
            {uploadStatus && (
              <div className={`mt-4 p-3 rounded ${uploadStatus.includes('successful') ? 'bg-green-100' : 'bg-red-100'}`}>
                <p>{uploadStatus}</p>
              </div>
            )}
            
            {uploadResult && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Upload Result:</h3>
                <pre className="p-3 bg-gray-100 rounded overflow-auto">
                  {JSON.stringify(uploadResult, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-300 rounded">
              <h3 className="font-semibold mb-2">Debug Information:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Make sure cookies are enabled in your browser</li>
                <li>Check browser console for any network errors</li>
                <li>Session cookie should be set and not expired</li>
                <li>Request includes credentials (credentials: 'include')</li>
                <li>CORS settings allow credentials</li>
              </ul>
              
              <div className="mt-4">
                <h4 className="font-semibold">Current Cookies:</h4>
                <div className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                  {cookies ? cookies : 'No cookies found'}
                </div>
                <button 
                  className="mt-2 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  onClick={() => setCookies(document.cookie)}
                >
                  Refresh Cookies
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
