import React from 'react';
import './globals.css'

export const metadata = {
  title: 'Secure File Management System',
  description: 'A modern, secure file storage system with advanced access control',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  )
}
