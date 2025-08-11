import { NextRequest, NextResponse } from 'next/server';
import { readMetadata, addFile, getApiKey } from '../../lib/storage';
import { rateLimit, rateLimits } from '../../lib/rateLimit';
// Using only session-based authentication, removing token imports
import { writeFile } from 'fs/promises';
import { createReadStream, createWriteStream, statSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// For Next.js App Router, we use a different configuration approach
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

// Helper to convert NextRequest to Node's IncomingMessage for formidable
// This helper is no longer needed with our new implementation
// function requestToIncomingMessage(req: NextRequest): IncomingMessage {
//   const nodeReq = new IncomingMessage(null as any);
//   nodeReq.method = req.method;
//   nodeReq.url = req.url;
//   nodeReq.headers = {};
  
//   req.headers.forEach((value, key) => {
//     nodeReq.headers[key] = value;
//   });

//   return nodeReq;
// }

export async function POST(req: NextRequest) {
  // Log all cookies for debugging
  console.log('Upload API received request with cookies:', 
    [...req.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 20)}...`)]);

  const rateLimited = await rateLimit(req, rateLimits.upload);
  if (rateLimited) return rateLimited;

  try {
    // Get the formData first to check for warehouse ID
    const formData = await req.formData();
    
    // Log the incoming form data for debugging
    console.log('Received form data in API route:');
    console.log('Form data entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value}`);
    }
    
    // Check if we have files in the request
    const files: File[] = [];
    
    // Always use getAll to handle multiple files correctly
    console.log('Checking for all files with key "file"...');
    const allFiles = formData.getAll('file');
    console.log(`Found ${allFiles.length} entries with name 'file'`);
    
    allFiles.forEach((item, index) => {
      if (item instanceof File) {
        console.log(`Adding file ${index + 1}/${allFiles.length}: ${item.name} (${item.size} bytes)`);
        files.push(item);
      } else {
        console.log(`Item ${index + 1} is not a File: ${typeof item}`);
      }
    });
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }
    
    // Get warehouseId from form data
    const warehouseId = formData.get('warehouseId') as string;
    
    if (!warehouseId) {
      return NextResponse.json({ error: 'Warehouse ID is required' }, { status: 400 });
    }
    
    // Check API key in header first
    let apiKey = req.headers.get('x-api-key');
    console.log('API Key from headers:', apiKey);
    
    // Log all headers for debugging
    console.log('All request headers:');
    req.headers.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });
    
    let keyData;
    let uploaderId = 'unknown';
    
    // If no API key in header, check for session
    if (!apiKey) {
      const sessionToken = req.cookies.get('session')?.value;
      
      console.log('No API key provided, checking session');
      console.log('Session cookie present:', !!sessionToken);
      console.log('Available cookies:', [...req.cookies.getAll().map(c => c.name)].join(', '));
      
      if (sessionToken) {
        try {
          // Import the session verification function to avoid circular dependencies
          const { verifySessionToken } = await import('../../lib/session');
          
          // Verify session and get user info
          const sessionData = await verifySessionToken(sessionToken);
          
          console.log('Session verification result:', sessionData ? 'Valid session' : 'Invalid session');
          
          if (sessionData && sessionData.user) {
            const user = sessionData.user;
            console.log(`User authenticated via session: ${user.email} (${user.role})`);
            console.log(`User warehouse IDs: ${user.warehouseIds?.join(', ') || 'none'}`);
            console.log(`Requested warehouse ID: ${warehouseId}`);
            
            // If user is authenticated, check if they have access to the warehouse
            if (user.role === 'admin' || user.role === 'superadmin' || 
                (user.warehouseIds && user.warehouseIds.includes(warehouseId))) {
              
              console.log(`User has access to warehouse ${warehouseId}`);
              
              // Find a valid API key for this warehouse or use a dummy one for auth users
              const meta = readMetadata();
              const apiKeyForWarehouse = meta.apiKeys.find(k => k.warehouseId === warehouseId);
              
              if (apiKeyForWarehouse) {
                apiKey = apiKeyForWarehouse.key;
                keyData = apiKeyForWarehouse;
                uploaderId = user.id; // Use user ID as uploader
              } else {
                // For authorized users, create a temporary key data
                apiKey = 'user-session-auth';
                keyData = {
                  key: 'user-session-auth',
                  warehouseId: warehouseId,
                  createdAt: new Date().toISOString(),
                  isActive: true
                };
                uploaderId = user.id;
              }
            } else {
              console.log(`User does not have access to warehouse ${warehouseId}`);
              return NextResponse.json({ error: 'You do not have access to this warehouse' }, { status: 403 });
            }
          } else {
            console.log('Session is invalid or expired');
          }
        } catch (error) {
          console.error('Session verification error:', error);
        }
      } else {
        console.log('No session cookie found in request');
      }
    }
    
    // If still no API key, return error
    if (!apiKey) {
      // Special case for requests with valid session cookies
      const sessionToken = req.cookies.get('session')?.value;
      if (sessionToken) {
        try {
          // Import the session verification function to avoid circular dependencies
          const { verifySessionToken } = await import('../../lib/session');
          
          // Verify session and get user info
          const sessionData = await verifySessionToken(sessionToken);
          if (sessionData && sessionData.user) {
            const user = sessionData.user;
            console.log(`User authenticated via session: ${user.email} (${user.role})`);
            console.log(`User warehouse IDs: ${user.warehouseIds?.join(', ') || 'none'}`);
            console.log(`Requested warehouse ID: ${warehouseId}`);
            
            // If user is authenticated, check if they have access to the warehouse
            if (user.role === 'admin' || user.role === 'superadmin' || 
                (user.warehouseIds && user.warehouseIds.includes(warehouseId))) {
              
              console.log(`User has access to warehouse ${warehouseId}`);
              
              // For authorized users, create a temporary key
              apiKey = 'user-session-auth';
              keyData = {
                key: 'user-session-auth',
                warehouseId: warehouseId,
                createdAt: new Date().toISOString(),
                isActive: true
              };
              uploaderId = user.id;
            } else {
              console.log(`User does not have access to warehouse ${warehouseId}`);
              return NextResponse.json({ error: 'You do not have access to this warehouse' }, { status: 403 });
            }
          } else {
            console.log('Session is invalid or expired');
            return NextResponse.json({ error: 'Authentication required. Please provide an API key or log in.' }, { status: 401 });
          }
        } catch (error) {
          console.error("Session verification error:", error);
          return NextResponse.json({ error: 'Authentication required. Please provide an API key or log in.' }, { status: 401 });
        }
      } else {
        return NextResponse.json({ error: 'Authentication required. Please provide an API key or log in.' }, { status: 401 });
      }
    }
    
    // If we have an API key but no keyData yet, validate it
    if (!keyData) {
      // Special handling for session-authenticated users
      if (apiKey === 'user-session-auth') {
        keyData = {
          key: 'user-session-auth',
          warehouseId: warehouseId,
          createdAt: new Date().toISOString(),
          isActive: true
        };
      } else if (apiKey) {
        console.log('Validating API key:', apiKey);
        // Log all available API keys for debugging
        const meta = readMetadata();
        console.log('Available API keys in the system:');
        meta.apiKeys.forEach(k => {
          console.log(`- Key: ${k.key.substring(0, 10)}... for warehouse: ${k.warehouseId}`);
        });
        
        keyData = getApiKey(apiKey);
        console.log('API key validation result:', keyData ? 'Valid' : 'Invalid');
        
        if (!keyData) {
          return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
        }
      }
    }

    // Create directory for warehouse if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', warehouseId);
    await mkdir(uploadDir, { recursive: true });
    
    // Get uploader info from form data or use the one from session user
    const uploader = formData.get('uploader') as string || uploaderId;
    
    // Process all files
    console.log(`Processing ${files.length} files for upload to warehouse ${warehouseId}`);
    
    if (files.length === 0) {
      console.error('No valid files found in the FormData');
      return NextResponse.json({ error: 'No valid files found in the request' }, { status: 400 });
    }

    // Get custom originalNames from formData if provided
    const customNames = formData.getAll('originalName');
    
    const uploadResults = await Promise.all(files.map(async (file, index) => {
      console.log(`Processing file ${index + 1}/${files.length}: ${file.name}`);
      
      // Get the file extension from the original file
      const fileExt = file.name.substring(file.name.lastIndexOf('.')) || '';
      
      // If custom name is provided for this file, use it with original extension
      const customName = customNames[index];
      const originalName = customName 
        ? (customName.toString().endsWith(fileExt) ? customName.toString() : customName.toString() + fileExt)
        : file.name;
      
      // Generate unique filename with timestamp to avoid collisions
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${file.name}`;
      const filePath = join(uploadDir, fileName);
      
      // Convert the file to a buffer and write it to the filesystem
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, fileBuffer);
      
      // Get file metadata
      const stats = statSync(filePath);
      console.log(`File ${index + 1} saved: ${fileName} (${stats.size} bytes)`);
      
      // Add file metadata
      const newFile = addFile({
        warehouseId,
        filename: fileName,
        originalName: originalName || 'unknown',
        uploadedAt: new Date().toISOString(),
        uploader,
        size: stats.size,
        mimeType: file.type || 'application/octet-stream',
        isVerified: true, // Auto-verify all files uploaded with a valid API key
        verifiedBy: 'system',
        verifiedAt: new Date().toISOString()
      });
      
      return {
        fileId: newFile.id,
        filename: fileName,
        originalName: file.name,
        size: stats.size,
        url: `/api/files/${warehouseId}/${fileName}`
      };
    }));
    
    console.log(`Successfully processed ${uploadResults.length} files`);
    
    const response = {
      success: true,
      files: uploadResults,
      count: uploadResults.length
    };
    
    console.log('Sending response:', response);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }
}
