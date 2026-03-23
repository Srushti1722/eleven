'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppConfig } from '@/app-config';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';
import { useAuth } from './AuthContext';

interface AuthPageProps {
  appConfig: AppConfig;
}

interface Account {
  name: string;
  password: string;
}

function getAccounts(): Record<string, Account> {
  try {
    const stored = localStorage.getItem('user_accounts');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error('error reading accounts', e);
    return {};
  }
}

function saveAccounts(accounts: Record<string, Account>) {
  localStorage.setItem('user_accounts', JSON.stringify(accounts));
}

export function AuthPage({ appConfig }: AuthPageProps) {
  const { login } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirm('');
    setError(null);
  };

  const validateEmail = (val: string) => {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const accounts = getAccounts();

    if (mode === 'signup') {
      if (!name || !email || !password || !confirm) {
        setError('All fields are required');
        return;
      }
      if (!validateEmail(email)) {
        setError('Invalid email address');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match');
        return;
      }
      if (accounts[email]) {
        setError('An account with this email already exists');
        return;
      }
      // create account
      accounts[email] = { name, password };
      saveAccounts(accounts);
      login({ email, name });
    } else {
      // login
      if (!email || !password) {
        setError('Email and password are required');
        return;
      }
      const acc = accounts[email];
      if (!acc || acc.password !== password) {
        setError('Invalid email or password');
        return;
      }
      login({ email, name: acc.name });
    }
    router.push('/');
  };

  return (
    <div className="bg-background grid h-screen place-items-center">
      <div className="bg-card w-full max-w-md rounded-lg p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{appConfig.pageTitle || 'Voice Agent'}</h1>
        </div>
        <div className="mb-4 flex">
          <button
            className={cn(
              'flex-1 py-2 font-semibold transition-colors',
              mode === 'login'
                ? 'border-primary text-primary border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => {
              setMode('login');
              resetForm();
            }}
          >
            Login
          </button>
          <button
            className={cn(
              'flex-1 py-2 font-semibold transition-colors',
              mode === 'signup'
                ? 'border-primary text-primary border-b-2'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => {
              setMode('signup');
              resetForm();
            }}
          >
            Signup
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background text-foreground w-full rounded border px-3 py-2"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background text-foreground w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background text-foreground w-full rounded border px-3 py-2"
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-sm font-medium">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="bg-background text-foreground w-full rounded border px-3 py-2"
              />
            </div>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="mt-2 w-full">
            {mode === 'login' ? 'Login' : 'Signup'}
          </Button>
        </form>
      </div>
    </div>
  );
}
