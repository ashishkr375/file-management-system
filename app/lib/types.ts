export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'superadmin' | 'admin' | 'user';
  warehouseIds?: string[]; // Updated to support multiple warehouse assignments
  name?: string; // Added for better user management
  createdAt?: string; // Track when user was created
}

export interface Warehouse {
  id: string;
  name: string;
  notes?: string;
  createdAt: string;
}

export interface ApiKey {
  key: string;
  warehouseId: string;
  createdAt: string;
  lastUsed?: string;
}

export interface StoredFile {
  id: string;
  warehouseId: string;
  filename: string;
  originalName: string;
  uploadedAt: string;
  uploader: string;
  size: number;
  mimeType: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface Metadata {
  users: User[];
  warehouses: Warehouse[];
  apiKeys: ApiKey[];
  files: StoredFile[];
}

export interface SignedUrlParams {
  warehouseId: string;
  filename: string;
  expiresIn: number; // seconds
}

export interface VerifyFileParams {
  fileId: string;
  isVerified: boolean;
}