/**
 * @project File Management System
 * @author Ashish Kumar (https://github.com/ashishkr375)
 * @website https://www.linkedin.com/in/ashish-kumar-nitp
 * @description A robust file management system built with Next.js
 * @license Free to use with attribution
 */

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
      <body className="min-h-screen bg-slate-50">{children}
        {/* --- FOOTER --- */}
      <footer className="border-t border-white/10 bg-[#050505] relative z-10">
        <div className="max-w-7xl mx-auto py-6 px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          
          {/* Copyright & Domain */}
          <div className="text-[10px] font-mono text-gray-500 flex flex-col md:flex-row items-center gap-2 md:gap-3">
            <span className="uppercase">© {new Date().getFullYear()} Ashish Kumar</span>
            <span className="hidden md:block text-white/10">|</span>
            <a 
              href="https://www.ashishk.online/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-orange-500 transition-colors uppercase tracking-wide border-b border-transparent hover:border-orange-500"
            >
              www.ashishk.online
            </a>
            <span className="hidden md:block text-white/10">|</span>
            <span className="uppercase">All Rights Reserved</span>
          </div>

          {/* Social Links */}
          <div className="flex gap-6 text-[10px] font-mono text-gray-500">
            <a href="https://github.com/ashishkr375" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">[GITHUB]</a>
            <a href="https://www.linkedin.com/in/ashish-kumar-nitp" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors">[LINKEDIN]</a>
          </div>
        </div>
      </footer>
      </body>
    </html>
  )
}
