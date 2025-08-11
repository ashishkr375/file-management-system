# File Management System

A robust file management system built with Next.js, providing a local S3-like storage solution with an admin dashboard for managing users, warehouses, and files.

**Clone the repository:**

```bash
git clone https://github.com/ashishkr375/file-management-system.git
```

## Features

- **Secure User Authentication**: JWT-based authentication for users.
- **Admin Dashboard**: A powerful dashboard for superadmins to manage the entire system.
- **User Management**: Create, view, and manage users with different roles.
- **Warehouse Management**: Create and manage storage "warehouses" for files.
- **File Uploads**: Upload files to specific warehouses.
- **Secure File Access**: Generate signed URLs for temporary, secure access to files.
- **API Management**: Create and manage API keys for programmatic access.
- **Role-Based Access Control**: Different levels of access for `superadmin`, `admin`, and `user` roles.
- **Local Storage**: Files are stored locally, mimicking a cloud storage service.

## Tech Stack

- **Framework**: Next.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: bcryptjs (for password hashing), jsonwebtoken (for tokens)
- **File Handling**: Formidable for parsing multipart/form-data.

## Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/ashishkr375/file-management-system.git
    cd file-management-system
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Initialization

This is a crucial step to set up the application's storage and create the default superadmin user.

1.  **Run the initialization script:**
    ```bash
    npm run init
    ```
    This script will:
    - Create the `storage` and `uploads` directories.
    - Create a `metadata.json` file in the `storage` directory to manage users, warehouses, files, and API keys.
    - Create a default **superadmin** user with the following credentials:
      - **Email**: `ashishk.dd22.cs@nitp.ac.in`
      - **Password**: `Your-Strong-Password`

### Running the Application

1.  **Start the development server:**

    ```bash
    npm run dev
    ```

2.  Open your browser and navigate to `http://localhost:3000`.

3.  Log in with the superadmin credentials to access the admin dashboard.

## Project Structure

```
file-management/
├── app/                  # Next.js App Router
│   ├── api/              # API routes
│   ├── admin/            # Admin dashboard pages
│   ├── user/             # User-specific pages
│   └── ...
├── components/           # Shared React components
├── lib/                  # Core logic, utilities, and types
├── scripts/              # Initialization scripts
│   └── init-storage.js   # Sets up storage and default admin
├── storage/              # Local storage for metadata
│   └── metadata.json
└── uploads/              # Directory for uploaded files
```

## API Endpoints

The API is organized by function under `/api`.

- **Auth**:
  - `POST /api/auth/login`: User login.
  - `GET /api/auth/me`: Get current user details.
- **Admin**:
  - `POST /api/admin/create-user`: Create a new user.
  - `GET /api/admin/list-users`: List all users.
  - `GET /api/admin/users/[userId]`: Get a specific user.
  - `POST /api/admin/create-api`: Create an API key.
  - `GET /api/admin/list-apis`: List all API keys.
  - `GET /api/admin/list-warehouses`: List all warehouses.
  - `GET /api/admin/warehouses/[warehouseId]`: Get a specific warehouse.
- **File Handling**:
  - `POST /api/upload`: Upload a file.
  - `GET /api/files/[warehouse]/[...file]`: Access a file.
  - `POST /api/signed-url`: Get a signed URL for a file.
- **User**:
  - `GET /api/user/files`: List files for the current user.
  - `GET /api/user/warehouses`: List warehouses for the current user.

## How It Works

The application uses a `metadata.json` file as a simple database to store information about users, warehouses, files, and API keys. When a file is uploaded, it's stored in the `uploads` directory, organized by warehouse, and its metadata is recorded. Access to files is controlled through signed URLs that expire after a short period.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a pull request.

## License

This project is licensed under the MIT License.
