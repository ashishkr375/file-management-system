import fs from 'fs';
import path from 'path';
import { Metadata, StoredFile, Warehouse, ApiKey } from './types';
import bcrypt from 'bcryptjs';

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const META_PATH = path.join(STORAGE_DIR, 'metadata.json');

// Initialize storage directories and default metadata file
function initializeStorage(): Metadata {
  // Create directories if they don't exist
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  
  // Load or create metadata file
  let metadata: Metadata;
  
  if (fs.existsSync(META_PATH)) {
    try {
      const data = fs.readFileSync(META_PATH, 'utf8');
      metadata = JSON.parse(data);
    } catch (error) {
      console.error('Error reading metadata file, creating new one:', error);
      metadata = { users: [], warehouses: [], apiKeys: [], files: [] };
      fs.writeFileSync(META_PATH, JSON.stringify(metadata, null, 2));
    }
  } else {
    metadata = { users: [], warehouses: [], apiKeys: [], files: [] };
    fs.writeFileSync(META_PATH, JSON.stringify(metadata, null, 2));
  }
  
  return metadata;
}

// Singleton pattern to avoid repeated initialization
let metadataCache: Metadata | null = null;

export function ensureStorage(): void {
  if (metadataCache !== null) return;

  // Initialize storage
  const metadata = initializeStorage();
  
  // Ensure default admin exists
  const adminEmail = 'ashishk.dd22.cs@nitp.ac.in';
  const defaultPassword = 'Ashish@nitp$1235';
  
  if (!metadata.users.find(u => u.email === adminEmail)) {
    console.log('Creating default admin user...');
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(defaultPassword, salt);
    
    metadata.users.push({
      id: 'admin-1',
      email: adminEmail,
      passwordHash,
      role: 'superadmin'
    });
    
    fs.writeFileSync(META_PATH, JSON.stringify(metadata, null, 2));
  }
  
  metadataCache = metadata;
}

export function readMetadata(): Metadata {
  if (metadataCache === null) {
    ensureStorage();
  }
  
  // Force reload from disk to get latest changes
  try {
    const data = fs.readFileSync(META_PATH, 'utf8');
    metadataCache = JSON.parse(data);
  } catch (error) {
    console.error('Error reading metadata file:', error);
    if (metadataCache === null) {
      metadataCache = { users: [], warehouses: [], apiKeys: [], files: [] };
    }
  }
  
  return metadataCache!;
}

export function writeMetadata(metadata: Metadata): void {
  fs.writeFileSync(META_PATH, JSON.stringify(metadata, null, 2));
  metadataCache = metadata; // Update cache
}

export function addWarehouse(warehouse: Omit<Warehouse, 'id' | 'createdAt'>): Warehouse {
  const meta = readMetadata();
  const newWarehouse: Warehouse = {
    id: `w-${Date.now()}`,
    name: warehouse.name,
    notes: warehouse.notes,
    createdAt: new Date().toISOString()
  };
  meta.warehouses.push(newWarehouse);
  writeMetadata(meta);
  return newWarehouse;
}

export function addApiKey(warehouseId: string): ApiKey {
  const meta = readMetadata();
  const warehouse = meta.warehouses.find(w => w.id === warehouseId);
  if (!warehouse) throw new Error('Warehouse not found');

  const apiKey: ApiKey = {
    key: generateApiKey(),
    warehouseId,
    createdAt: new Date().toISOString()
  };
  meta.apiKeys.push(apiKey);
  writeMetadata(meta);
  return apiKey;
}

export function addFile(file: Omit<StoredFile, 'id'>): StoredFile {
  const meta = readMetadata();
  const newFile: StoredFile = {
    id: `f-${Date.now()}`,
    ...file
  };
  meta.files.push(newFile);
  writeMetadata(meta);
  return newFile;
}

export function updateFile(fileId: string, updates: Partial<StoredFile>): StoredFile {
  const meta = readMetadata();
  const index = meta.files.findIndex(f => f.id === fileId);
  if (index === -1) throw new Error('File not found');
  
  meta.files[index] = { ...meta.files[index], ...updates };
  writeMetadata(meta);
  return meta.files[index];
}

export function getFile(fileId: string): StoredFile | undefined {
  const meta = readMetadata();
  return meta.files.find(f => f.id === fileId);
}

export function getApiKey(key: string): ApiKey | undefined {
  const meta = readMetadata();
  return meta.apiKeys.find(k => k.key === key);
}

function generateApiKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}