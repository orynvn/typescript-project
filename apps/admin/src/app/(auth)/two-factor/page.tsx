'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export default function TwoFactorPage(): JSX.Element {
  const router = useRouter();
  const validateTwoFactor = useAuthStore((state) => state.validateTwoFactor);
  const isLoading = useAuthStore((state) => state.isLoading);
  const pendingToken = useAuthStore((state) => state.pendingTwoFactorToken);
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setErrorMessage(null);
    try {
      await validateTwoFactor(code);
      router.push('/dashboard');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Invalid two-factor code');
    }
  }

  if (!pendingToken) {
    return (
      <section>
        <h1>Two-factor verification</h1>
        <p>Session expired. Please login again.</p>
      </section>
    );
  }

  return (
    <section>
      <h1>Two-factor verification</h1>
      <p>Enter the 6-digit code sent to your email or use a backup code.</p>
      <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" />
        {errorMessage ? <small>{errorMessage}</small> : null}
        <button type="button" onClick={() => void submit()} disabled={isLoading}>
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>
      </div>
    </section>
  );
}
