'use client';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      fetch(`http://localhost:8000/api/auth/callback?code=${code}`)
        .then(res => res.json())
        .then(data => {
          if (data.access_token) {
            localStorage.setItem('token', data.access_token);
            router.push('/dashboard');
          } else {
            router.push('/login?error=oauth_failed');
          }
        })
        .catch(() => router.push('/login?error=oauth_failed'));
    } else {
      router.push('/login');
    }
  }, [searchParams, router]);

  return <div style={{color:'white',display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0d1117'}}>Signing in with GitHub...</div>;
}

export default function AuthCallback() {
  return <Suspense><CallbackHandler /></Suspense>;
}
