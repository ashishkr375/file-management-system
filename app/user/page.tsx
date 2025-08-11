'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    const session = document.cookie.includes('session=');
    if (session) {
      router.push('/user/dashboard');
    }
  }, [router]);

  return null;
}
