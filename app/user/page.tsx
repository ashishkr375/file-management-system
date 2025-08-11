'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = document.cookie.includes('token=');
    if (token) {
      router.push('/user/dashboard');
    }
  }, [router]);

  return null;
}
