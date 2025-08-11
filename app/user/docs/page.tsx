'use client';

import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Link from 'next/link';

interface UserData {
  id: string;
  email: string;
  role: string;
}

export default function DocsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState('general');

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

  const isAdmin = userData?.role === 'admin' || userData?.role === 'superadmin';

  return (
    <div>
      <Toaster position="top-right" />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">API Documentation</h1>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('general')}
              >
                General Usage
              </button>
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'api'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('api')}
              >
                API Reference
              </button>
              {isAdmin && (
                <button
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'admin'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab('admin')}
                >
                  Admin Guide
                </button>
              )}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'general' && (
              <div className="prose max-w-none">
                <h2>Getting Started</h2>
                <p>
                  Welcome to the file management system documentation. This guide will help you understand how to use the system to manage your files.
                </p>

                <h3>System Overview</h3>
                <p>
                  This file management system allows you to:
                </p>
                <ul>
                  <li>Upload files to designated warehouses</li>
                  <li>Download files using secure, time-limited URLs</li>
                  <li>Manage file access through API keys</li>
                  <li>Track file status (verified vs. unverified)</li>
                </ul>

                <h3>Key Concepts</h3>
                <div className="mt-4 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900">Warehouses</h4>
                    <p className="text-gray-600">
                      Warehouses are storage containers for files. Each warehouse has its own API key for access control.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900">API Keys</h4>
                    <p className="text-gray-600">
                      API keys provide secure access to warehouses. Each warehouse has a unique API key that must be included in your requests.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900">Signed URLs</h4>
                    <p className="text-gray-600">
                      Signed URLs provide temporary, secure access to files. They expire after a set time period and cannot be tampered with.
                    </p>
                  </div>
                </div>

                <h3 className="mt-6">Dashboard Overview</h3>
                <p>
                  Your dashboard shows all warehouses you have access to, along with their API keys and files. From here, you can:
                </p>
                <ul>
                  <li>View warehouse details and API keys</li>
                  <li>See files stored in each warehouse</li>
                  <li>Generate temporary download links for files</li>
                </ul>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="prose max-w-none">
                <h2>API Reference</h2>
                <p>
                  This section provides detailed information about the available API endpoints and how to use them.
                </p>

                <h3>Authentication</h3>
                <p>
                  All API requests require authentication using an API key. The API key should be included in the request headers.
                </p>

                <div className="bg-gray-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
                  <pre>{`X-API-Key: your-api-key-here`}</pre>
                </div>

                <h3 className="mt-6">Endpoints</h3>

                {/* Upload File */}
                <div className="mt-4 border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">Upload File(s)</h4>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">POST</span> /api/upload
                    </p>
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700">Authentication Methods</h5>
                      <p className="text-sm text-gray-600">
                        This endpoint supports two authentication methods:
                      </p>
                      <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                        <li>API Key in header (for programmatic access)</li>
                        <li>JWT Token in cookies (for authenticated web users)</li>
                      </ul>
                    </div>
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700">Request Headers</h5>
                      <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                        <pre>{`X-API-Key: your-api-key-here
Content-Type: multipart/form-data`}</pre>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700">Request Body</h5>
                      <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                        <pre>{`file: File or File[] (binary) - Single file or array of files
warehouseId: string - ID of the target warehouse
originalName: string (optional) - Custom filename for the uploaded file. If provided, the extension from the original file will be preserved.`}</pre>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700">Response (Single File)</h5>
                      <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                        <pre>{`{
  "success": true,
  "files": [
    {
      "fileId": "file-1234567890",
      "filename": "1692345678-example.jpg",
      "originalName": "example.jpg",
      "size": 12345,
      "url": "/api/files/{warehouseId}/{filename}"
    }
  ],
  "count": 1
}`}</pre>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700">Response (Multiple Files)</h5>
                      <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                        <pre>{`{
  "success": true,
  "files": [
    {
      "fileId": "file-1234567890",
      "filename": "1692345678-example1.jpg",
      "originalName": "example1.jpg",
      "size": 12345,
      "url": "/api/files/{warehouseId}/{filename}"
    },
    {
      "fileId": "file-0987654321",
      "filename": "1692345679-example2.jpg",
      "originalName": "example2.jpg",
      "size": 67890,
      "url": "/api/files/{warehouseId}/{filename}"
    }
  ],
  "count": 2
}`}</pre>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Get File */}
                <div className="mt-4 border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">Get a File</h4>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">GET</span> /api/files/{`{warehouseId}/{filename}`}
                    </p>
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700">Response</h5>
                      <p className="text-sm text-gray-600">
                        Returns the file content with appropriate Content-Type header.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Get Signed URL */}
                <div className="mt-4 border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">Get Signed URL</h4>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">POST</span> /api/signed-url
                    </p>
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700">Request Headers</h5>
                      <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                        <pre>{`X-API-Key: your-api-key-here
Content-Type: application/json`}</pre>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700">Request Body</h5>
                      <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                        <pre>{`{
  "warehouseId": "warehouse-id",
  "filename": "example.jpg",
  "expiresIn": 3600  // Seconds until expiration
}`}</pre>
                      </div>
                    </div>
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700">Response</h5>
                      <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                        <pre>{`{
  "success": true,
  "signedUrl": "/api/files/{warehouseId}/{filename}?signature=abc123&expires=1234567890"
}`}</pre>
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="mt-6">Code Examples</h3>

                {/* React Hook Examples */}
                <div className="mt-4">
                  <h4 className="font-medium">React Hook Example</h4>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                    <pre>{`import { useState } from 'react';

// Custom hook for file uploads
export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // Upload a single file or multiple files
  async function uploadFiles(files, warehouseId, apiKey) {
    setIsUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // Append each file to the form data
      if (Array.isArray(files)) {
        files.forEach((file, index) => {
          formData.append('file', file);
          // You can also provide custom names for each file
          // formData.append('originalName', 'custom-name-' + index + getFileExtension(file.name));
        });
      } else {
        formData.append('file', files);
        // For single file upload with custom name
        // formData.append('originalName', 'custom-name' + getFileExtension(files.name));
      }
      
      // Include the warehouse ID
      formData.append('warehouseId', warehouseId);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: apiKey ? {
          'X-API-Key': apiKey
        } : undefined,
        body: formData
      });
      
      setProgress(100);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }
  
  return {
    uploadFiles,
    isUploading,
    progress,
    error
  };
}`}</pre>
                  </div>
                </div>

                {/* React Component Example */}
                <div className="mt-4">
                  <h4 className="font-medium">React Component Example</h4>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                    <pre>{`import { useState } from 'react';
import { useFileUpload } from './useFileUpload';

export function FileUploadComponent({ warehouseId, apiKey }) {
  const [files, setFiles] = useState([]);
  const [uploadResults, setUploadResults] = useState(null);
  const { uploadFiles, isUploading, error } = useFileUpload();
  
  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;
    
    try {
      const results = await uploadFiles(files, warehouseId, apiKey);
      setUploadResults(results);
      setFiles([]);
      alert(\`Successfully uploaded \${results.count} file(s)\`);
    } catch (err) {
      console.error('Upload error:', err);
    }
  };
  
  return (
    <div>
      <h2>Upload Files to Warehouse</h2>
      <form onSubmit={handleSubmit}>
        <input 
          type="file" 
          multiple 
          onChange={handleFileChange} 
        />
        
        {files.length > 0 && (
          <div>
            <h3>Selected Files:</h3>
            <ul>
              {files.map((file, index) => (
                <li key={index}>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={isUploading || files.length === 0}
        >
          {isUploading ? 'Uploading...' : 'Upload Files'}
        </button>
        
        {error && <div className="error">{error}</div>}
        
        {uploadResults && (
          <div>
            <h3>Upload Results:</h3>
            <p>{uploadResults.count} file(s) uploaded successfully.</p>
            <ul>
              {uploadResults.files.map((file, index) => (
                <li key={index}>
                  <a href={file.url} target="_blank" rel="noreferrer">
                    {file.originalName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}`}</pre>
                  </div>
                </div>

                {/* Next.js API Route Example */}
                <div className="mt-4">
                  <h4 className="font-medium">Next.js API Route Example</h4>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                    <pre>{`// Example of a Next.js API route that forwards uploads to this service
// pages/api/forward-upload.js or app/api/forward-upload/route.js

// Using the App Router
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // Get user's session or auth info
    const session = await getServerSession(/* auth options */);
    
    // Forward the upload to the file management service
    const response = await fetch('https://your-file-service.com/api/upload', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.FILE_SERVICE_API_KEY,
      },
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Upload failed' },
        { status: response.status }
      );
    }
    
    // Store relevant info in your database if needed
    await saveFileInfoToDatabase({
      userId: session?.user?.id,
      files: data.files,
      // ...other relevant data
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Upload forwarding error:', error);
    return NextResponse.json(
      { error: 'Server error processing upload' },
      { status: 500 }
    );
  }
}`}</pre>
                  </div>
                </div>

                {/* cURL Example */}
                <div className="mt-4">
                  <h4 className="font-medium">cURL Examples</h4>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                    <pre>{`# Upload a single file with custom filename
curl -X POST \\
  -H "X-API-Key: your-api-key-here" \\
  -F "file=@/path/to/your/file.jpg" \\
  -F "warehouseId=w-1234567890" \\
  -F "originalName=my-custom-filename.jpg" \\
  http://localhost:3000/api/upload

# Upload multiple files with custom filenames
curl -X POST \\
  -H "X-API-Key: your-api-key-here" \\
  -F "file=@/path/to/file1.jpg" \\
  -F "file=@/path/to/file2.pdf" \\
  -F "file=@/path/to/file3.png" \\
  -F "originalName=custom-image.jpg" \\
  -F "originalName=custom-document.pdf" \\
  -F "originalName=custom-picture.png" \\
  -F "warehouseId=w-1234567890" \\
  http://localhost:3000/api/upload

# Get a signed URL
curl -X POST \\
  -H "X-API-Key: your-api-key-here" \\
  -H "Content-Type: application/json" \\
  -d '{"warehouseId":"warehouse-id","filename":"example.jpg","expiresIn":3600}' \\
  http://localhost:3000/api/signed-url`}</pre>
                  </div>
                </div>
                
                {/* Integration with Other Applications */}
                <div className="mt-8">
                  <h3 className="font-medium text-xl">Integration with Other Applications</h3>
                  <p className="mt-2">
                    This file management system can be integrated with various types of applications.
                    Below are examples for different platforms and frameworks.
                  </p>
                  
                  {/* Node.js Backend Integration */}
                  <div className="mt-4">
                    <h4 className="font-medium">Node.js Backend Integration</h4>
                    <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                      <pre>{`// Using Node.js with Express and multer
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'temp/' }); // Temporary storage

app.post('/proxy-upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    const warehouseId = req.body.warehouseId;
    const apiKey = process.env.FILE_SERVICE_API_KEY;
    
    // Create a form data object
    const formData = new FormData();
    formData.append('warehouseId', warehouseId);
    
    // Append each file to the form data
    for (const file of files) {
      formData.append('file', fs.createReadStream(file.path), file.originalname);
    }
    
    // Send the request to the file management service
    const response = await axios.post('http://your-file-service.com/api/upload', formData, {
      headers: {
        'X-API-Key': apiKey,
        ...formData.getHeaders()
      }
    });
    
    // Clean up temporary files
    for (const file of files) {
      fs.unlinkSync(file.path);
    }
    
    res.json(response.data);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`}</pre>
                    </div>
                  </div>
                  
                  {/* PHP Integration */}
                  <div className="mt-4">
                    <h4 className="font-medium">PHP Integration</h4>
                    <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                      <pre>{`<?php
// PHP example for uploading files to the service

function uploadFilesToService($files, $warehouseId, $apiKey) {
  $url = 'http://your-file-service.com/api/upload';
  
  $curl = curl_init();
  
  $postFields = [
    'warehouseId' => $warehouseId
  ];
  
  // Add files to the request
  foreach ($files['tmp_name'] as $index => $tmpName) {
    $postFields['file[' . $index . ']'] = curl_file_create(
      $tmpName,
      $files['type'][$index],
      $files['name'][$index]
    );
  }
  
  curl_setopt_array($curl, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $postFields,
    CURLOPT_HTTPHEADER => [
      'X-API-Key: ' . $apiKey
    ]
  ]);
  
  $response = curl_exec($curl);
  $error = curl_error($curl);
  
  curl_close($curl);
  
  if ($error) {
    throw new Exception('cURL Error: ' . $error);
  }
  
  return json_decode($response, true);
}

// Example usage in a form handler
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['files'])) {
  try {
    $apiKey = 'your-api-key-here';
    $warehouseId = $_POST['warehouseId'] ?? null;
    
    if (!$warehouseId) {
      throw new Exception('Warehouse ID is required');
    }
    
    $result = uploadFilesToService($_FILES['files'], $warehouseId, $apiKey);
    
    // Handle successful upload
    echo json_encode($result);
  } catch (Exception $e) {
    // Handle error
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
  }
}
?>`}</pre>
                    </div>
                  </div>
                  
                  {/* Python Integration */}
                  <div className="mt-4">
                    <h4 className="font-medium">Python Integration</h4>
                    <div className="mt-2 bg-gray-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                      <pre>{`# Python example with requests library
import requests

def upload_files_to_service(files, warehouse_id, api_key):
    """
    Upload files to the file management service
    
    Args:
        files: List of file paths or file-like objects
        warehouse_id: ID of the target warehouse
        api_key: API key for authentication
        
    Returns:
        Response data from the service
    """
    url = 'http://your-file-service.com/api/upload'
    
    # Prepare files for upload
    files_data = []
    for file_path in files:
        files_data.append(('file', (file_path.split('/')[-1], open(file_path, 'rb'))))
    
    # Add warehouse ID
    data = {'warehouseId': warehouse_id}
    
    # Send request
    headers = {'X-API-Key': api_key}
    response = requests.post(url, headers=headers, data=data, files=files_data)
    
    # Close all file objects
    for _, (_, file_obj) in files_data:
        file_obj.close()
    
    # Check response
    response.raise_for_status()
    return response.json()

# Example usage
if __name__ == '__main__':
    try:
        api_key = 'your-api-key-here'
        warehouse_id = 'w-1234567890'
        files_to_upload = [
            '/path/to/file1.jpg',
            '/path/to/file2.pdf',
            '/path/to/file3.png'
        ]
        
        result = upload_files_to_service(files_to_upload, warehouse_id, api_key)
        print(f"Successfully uploaded {result['count']} files:")
        for file in result['files']:
            print(f"- {file['originalName']} ({file['url']})")
    except Exception as e:
        print(f"Error: {e}")
`}</pre>
                    </div>
                  </div>
                  
                  {/* Troubleshooting Section */}
                  <div className="mt-8">
                    <h3 className="font-medium text-xl">Troubleshooting</h3>
                    <p className="mt-2">
                      Common issues and solutions when working with the file management API.
                    </p>
                    
                    <div className="mt-4 space-y-4">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium text-gray-900">Authentication Errors</h4>
                        <p className="text-gray-600 mt-1">
                          <span className="font-semibold">Issue:</span> "Unauthorized" or "Invalid API key" errors
                        </p>
                        <div className="mt-2">
                          <p className="text-gray-600 font-medium">Solutions:</p>
                          <ul className="list-disc list-inside mt-1 text-gray-600">
                            <li>Verify that you're including the API key in the <code className="bg-gray-100 px-1 py-0.5 rounded">X-API-Key</code> header</li>
                            <li>Check that the API key is valid and has access to the specified warehouse</li>
                            <li>Ensure the API key hasn't been revoked or expired</li>
                            <li>For web requests, check if you're logged in and have a valid JWT token in cookies</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium text-gray-900">File Upload Issues</h4>
                        <p className="text-gray-600 mt-1">
                          <span className="font-semibold">Issue:</span> "No files uploaded" or upload failures
                        </p>
                        <div className="mt-2">
                          <p className="text-gray-600 font-medium">Solutions:</p>
                          <ul className="list-disc list-inside mt-1 text-gray-600">
                            <li>Ensure that you're sending the file with the correct field name: <code className="bg-gray-100 px-1 py-0.5 rounded">file</code></li>
                            <li>Check that the <code className="bg-gray-100 px-1 py-0.5 rounded">warehouseId</code> is included in the request</li>
                            <li>Verify that the file isn't empty and is under the size limit (100MB by default)</li>
                            <li>For multipart form uploads, make sure you're using the correct <code className="bg-gray-100 px-1 py-0.5 rounded">Content-Type</code></li>
                            <li>Check network connectivity and file permissions</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium text-gray-900">Rate Limiting</h4>
                        <p className="text-gray-600 mt-1">
                          <span className="font-semibold">Issue:</span> "Too many requests" or "Rate limit exceeded" errors
                        </p>
                        <div className="mt-2">
                          <p className="text-gray-600 font-medium">Solutions:</p>
                          <ul className="list-disc list-inside mt-1 text-gray-600">
                            <li>Wait before making more requests (default cooldown is 60 seconds)</li>
                            <li>Implement backoff and retry logic in your application</li>
                            <li>For bulk uploads, consider batching files or using the signed URL approach</li>
                            <li>Contact the system administrator if you need higher rate limits</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium text-gray-900">CORS Issues</h4>
                        <p className="text-gray-600 mt-1">
                          <span className="font-semibold">Issue:</span> CORS errors when uploading from a browser
                        </p>
                        <div className="mt-2">
                          <p className="text-gray-600 font-medium">Solutions:</p>
                          <ul className="list-disc list-inside mt-1 text-gray-600">
                            <li>Ensure your domain is allowed in the CORS configuration</li>
                            <li>Use a proxy API on your server to forward the upload request</li>
                            <li>For development, use the same origin or consider a CORS browser extension (for testing only)</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium text-gray-900">File Access Issues</h4>
                        <p className="text-gray-600 mt-1">
                          <span className="font-semibold">Issue:</span> Unable to access uploaded files
                        </p>
                        <div className="mt-2">
                          <p className="text-gray-600 font-medium">Solutions:</p>
                          <ul className="list-disc list-inside mt-1 text-gray-600">
                            <li>Check if the file was successfully uploaded (verify the upload response)</li>
                            <li>Ensure you're using the correct URL format: <code className="bg-gray-100 px-1 py-0.5 rounded">/api/files/&#123;warehouseId&#125;/&#123;filename&#125;</code></li>
                            <li>Verify that the file is verified or use a signed URL for unverified files</li>
                            <li>Check permissions - you need access to the warehouse containing the file</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {/* Security Best Practices */}
                    <div className="mt-8">
                      <h3 className="font-medium text-xl">Security Best Practices</h3>
                      <p className="mt-2">
                        Follow these best practices to ensure secure file handling in your application.
                      </p>
                      
                      <div className="mt-4 space-y-4">
                        <div className="bg-gray-50 p-4 rounded-md">
                          <h4 className="font-medium text-gray-900">API Key Management</h4>
                          <ul className="list-disc list-inside mt-2 text-gray-600">
                            <li>Store API keys securely in environment variables or a secure vault</li>
                            <li>Never expose API keys in client-side code or public repositories</li>
                            <li>Use different API keys for development and production environments</li>
                            <li>Rotate API keys periodically and after team member departures</li>
                            <li>Set up alerts for suspicious API key usage patterns</li>
                          </ul>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-md">
                          <h4 className="font-medium text-gray-900">File Upload Security</h4>
                          <ul className="list-disc list-inside mt-2 text-gray-600">
                            <li>Validate file types and sizes before uploading</li>
                            <li>Scan uploads for malware using an anti-virus solution</li>
                            <li>Implement file type detection beyond extension checking</li>
                            <li>Store user-uploaded files outside the web root directory</li>
                            <li>Use content security policies to prevent XSS attacks</li>
                          </ul>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-md">
                          <h4 className="font-medium text-gray-900">Authentication and Access Control</h4>
                          <ul className="list-disc list-inside mt-2 text-gray-600">
                            <li>Use the principle of least privilege when assigning warehouse access</li>
                            <li>Implement proper session management for web interfaces</li>
                            <li>Set short expiration times for signed URLs</li>
                            <li>Log all file access and administrative actions</li>
                            <li>Regularly audit user permissions and access</li>
                          </ul>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-md">
                          <h4 className="font-medium text-gray-900">Server Configuration</h4>
                          <ul className="list-disc list-inside mt-2 text-gray-600">
                            <li>Keep your server and all dependencies up to date</li>
                            <li>Configure proper CORS settings to prevent unauthorized cross-origin requests</li>
                            <li>Set appropriate file upload size limits</li>
                            <li>Implement rate limiting to prevent abuse</li>
                            <li>Use HTTPS for all communications</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'admin' && isAdmin && (
              <div className="prose max-w-none">
                <h2>Admin Guide</h2>
                <p>
                  This section provides guidance for administrators on how to manage the file storage system.
                </p>

                <h3>User Management</h3>
                <p>
                  As an administrator, you can create and manage user accounts, assign warehouse access, and control user permissions.
                </p>

                <div className="mt-4 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900">Creating Users</h4>
                    <p className="text-gray-600">
                      To create a new user:
                    </p>
                    <ol className="mt-2 list-decimal list-inside text-gray-600">
                      <li>Navigate to the Admin Panel</li>
                      <li>Click on "Manage Users"</li>
                      <li>Fill out the user creation form with email, password, and role</li>
                      <li>Assign one or more warehouses to the user</li>
                      <li>Click "Create User"</li>
                    </ol>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900">Editing Users</h4>
                    <p className="text-gray-600">
                      To edit an existing user:
                    </p>
                    <ol className="mt-2 list-decimal list-inside text-gray-600">
                      <li>Navigate to the Admin Panel</li>
                      <li>Click on "Manage Users"</li>
                      <li>Find the user in the list and click the edit icon</li>
                      <li>Update the user details</li>
                      <li>Click "Update User"</li>
                    </ol>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900">Deleting Users</h4>
                    <p className="text-gray-600">
                      To delete a user:
                    </p>
                    <ol className="mt-2 list-decimal list-inside text-gray-600">
                      <li>Navigate to the Admin Panel</li>
                      <li>Click on "Manage Users"</li>
                      <li>Find the user in the list and click the delete icon</li>
                      <li>Confirm the deletion</li>
                    </ol>
                    <p className="text-gray-600 mt-2">
                      Note: Superadmin users cannot be deleted.
                    </p>
                  </div>
                </div>

                <h3 className="mt-6">Warehouse Management</h3>
                <p>
                  Warehouses are the storage containers for files. Each warehouse has its own API key for access control.
                </p>

                <div className="mt-4 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900">Creating Warehouses</h4>
                    <p className="text-gray-600">
                      To create a new warehouse:
                    </p>
                    <ol className="mt-2 list-decimal list-inside text-gray-600">
                      <li>Navigate to the Admin Panel</li>
                      <li>Fill out the warehouse creation form with a name and optional notes</li>
                      <li>Click "Create Warehouse"</li>
                      <li>An API key will be generated automatically</li>
                    </ol>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900">API Key Management</h4>
                    <p className="text-gray-600">
                      API keys are generated automatically when a warehouse is created. These keys are used to authenticate API requests.
                    </p>
                    <p className="text-gray-600 mt-2">
                      Important: Keep API keys secure. Anyone with the API key can access the warehouse.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900">Deleting Warehouses</h4>
                    <p className="text-gray-600">
                      To delete a warehouse:
                    </p>
                    <ol className="mt-2 list-decimal list-inside text-gray-600">
                      <li>Navigate to the Admin Panel</li>
                      <li>Find the warehouse in the list</li>
                      <li>Click the delete button</li>
                      <li>Confirm the deletion</li>
                    </ol>
                    <p className="text-gray-600 mt-2 text-red-600 font-semibold">
                      Warning: Deleting a warehouse will delete all files within it and revoke all API keys associated with it.
                    </p>
                  </div>
                </div>

                <h3 className="mt-6">File Verification</h3>
                <p>
                  File verification is a security feature to ensure that only authorized files are accessible.
                </p>

                <div className="mt-4 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900">Verification System</h4>
                    <p className="text-gray-600">
                      All files uploaded through the API with a valid API key are automatically verified.
                      This makes them immediately accessible via both direct URLs and signed URLs.
                    </p>
                    <p className="text-gray-600 mt-2">
                      Files that aren't verified can still be accessed using signed URLs, but not through direct public URLs.
                      This provides security while maintaining usability.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900">Signed URLs for All Files</h4>
                    <p className="text-gray-600">
                      You can generate signed URLs for any file in your warehouses, regardless of verification status.
                      These URLs are secure, time-limited, and can be shared with others.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
