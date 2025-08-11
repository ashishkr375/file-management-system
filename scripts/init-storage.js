/**
 * @fileoverview Storage initialization script for File Management System
 * @author Ashish Kumar (https://github.com/ashishkr375)
 * @copyright (c) 2025 Ashish Kumar. All rights reserved.
 * @license MIT - Free to use with attribution
 * @repository https://github.com/ashishkr375/file-management-system
 * @linkedin https://www.linkedin.com/in/ashish-kumar-nitp
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Define paths
const STORAGE_DIR = path.join(process.cwd(), 'storage');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const META_PATH = path.join(STORAGE_DIR, 'metadata.json');

// Create directories if they don't exist
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Load or create metadata file
let metadata;
if (fs.existsSync(META_PATH)) {
  try {
    const data = fs.readFileSync(META_PATH, 'utf8');
    metadata = JSON.parse(data);
  } catch (error) {
    console.error('Error reading metadata file, creating new one:', error);
    metadata = { users: [], warehouses: [], apiKeys: [], files: [] };
  }
} else {
  metadata = {
    _metadata: {
      system: "File Management System",
      version: "1.0.0",
      creator: "Ashish Kumar",
      github: "https://github.com/ashishkr375",
      repository: "https://github.com/ashishkr375/file-management-system",
      linkedin: "https://www.linkedin.com/in/ashish-kumar-nitp",
      license: "MIT - Free to use with attribution",
      created: new Date().toISOString()
    },
    users: [],
    warehouses: [],
    apiKeys: [],
    files: []
  };
}

// Ensure default admin exists
const adminEmail = 'ashishk.dd22.cs@nitp.ac.in';
const defaultPassword = 'Your-Strong-Password';

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
  console.log('✅ Admin user created successfully!');
} else {
  console.log('✅ Admin user already exists');
}

console.log('✅ Storage initialized with default admin user');
console.log('Email: ashishk.dd22.cs@nitp.ac.in');
console.log('Password: Ashish@nitp$1235');
