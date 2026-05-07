'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/stores/auth.store';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    try {
      await login(values.email, values.password);
      router.push('/dashboard');
    } catch {
      setErrorMessage('Invalid credentials');
    }
  });

  return (
    <section>
      <h1>Admin Login</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <input placeholder="Email" {...register('email')} />
        {formState.errors.email && <small>{formState.errors.email.message}</small>}
        <input type="password" placeholder="Password" {...register('password')} />
        {formState.errors.password && <small>{formState.errors.password.message}</small>}
        {errorMessage && <small>{errorMessage}</small>}
        <button disabled={isLoading} type="submit">
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
