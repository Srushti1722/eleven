'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { AppConfig } from '@/app-config';
import { cn } from '@/lib/shadcn/utils';
import { Button } from '@/components/ui/button';

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
    <div className="h-screen grid place-items-center bg-background">
      <div className="w-full max-w-md p-8 bg-card shadow-lg rounded-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{appConfig.pageTitle || 'Voice Agent'}</h1>
        </div>
        <div className="flex mb-4">
          <button
            className={cn(
              'flex-1 py-2 font-semibold transition-colors',
              mode === 'login'
                ? 'border-b-2 border-primary text-primary'
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
                ? 'border-b-2 border-primary text-primary'
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
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border px-3 py-2 bg-background text-foreground"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2 bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border px-3 py-2 bg-background text-foreground"
            />
          </div>
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded border px-3 py-2 bg-background text-foreground"
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full mt-2">
            {mode === 'login' ? 'Login' : 'Signup'}
          </Button>
        </form>
      </div>
    </div>
  );
}
