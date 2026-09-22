'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { Mail, Lock, Loader2, Shirt, Eye, EyeOff } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { authApi, AuthCredentials, AuthResponse } from '@/api/auth';
import { AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { classNames } from '@/lib/styles/classNames';

export default function AuthPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  // Form states
  const [formData, setFormData] = useState<AuthCredentials>({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const loginMutation = useMutation({
    mutationFn: (data: AuthCredentials) => authApi.signin(data),
    onSuccess: (data: AuthResponse) => {
      // Manually set access_token cookie for localhost if it came in the body
      if (data.accessToken) {
        Cookies.set('access_token', data.accessToken, { expires: 1 });
      }
      router.push('/');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: AuthCredentials) => authApi.signup(data),
    onSuccess: (data: AuthResponse) => {
      // Manually set access_token cookie for localhost if it came in the body
      if (data.accessToken) {
        Cookies.set('access_token', data.accessToken, { expires: 1 });
      }
      router.push('/');
    },
  });

  const handleTabChange = () => {
    setFormData({ email: '', password: '', confirmPassword: '' });
    setPasswordMismatch(false);
    loginMutation.reset();
    registerMutation.reset();
  };

  const handleAuth = (type: 'signin' | 'signup') => {
    console.log(type);
    if (type === 'signin') {
      loginMutation.mutate(formData);
    } else {
      if (formData.password !== formData.confirmPassword) {
        setPasswordMismatch(true);
        return;
      }
      setPasswordMismatch(false);
      registerMutation.mutate(formData);
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;
  const error = (loginMutation.error as AxiosError<{message: string}>)?.response?.data?.message || 
                (registerMutation.error as AxiosError<{message: string}>)?.response?.data?.message || 
                (loginMutation.error || registerMutation.error ? 'An unexpected error occurred' : null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans selection:bg-primary/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2 flex items-center justify-center gap-3">
            <Shirt className="w-10 h-10 text-primary animate-pulse" />
            Fitly
          </h1>
          <p className="text-stone-300 font-medium">Curate your perfect outfit</p>
        </div>

        <div className="bg-card backdrop-blur-xl border border-border p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          {/* Animated border line at top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#A855F7]/30 to-transparent opacity-50" />

          <TabGroup onChange={handleTabChange}>
            <TabList className="flex p-1.5 space-x-1 bg-white/5 rounded-2xl mb-8 border border-white/5">
              {['Login', 'Register'].map((category) => (
                <Tab
                  key={category}
                  className={({ selected }) =>
                    classNames(
                      'cursor-pointer w-full py-3 text-sm text-[var(--text-color-dark)] font-bold leading-5 rounded-xl transition-all duration-300 outline-none border border-transparent',
                      selected
                        ? 'bg-primary shadow-lg shadow-primary/25 border-white/20'
                        : 'bg-white/[0.02] text-[var(--text-color-secondary)] hover:text-white hover:bg-white/10'
                    )
                  }
                >
                  {category}
                </Tab>
              ))}
            </TabList>

            <TabPanels>
              <TabPanel className="focus:outline-none">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleAuth('signin'); }} 
                  className="space-y-5"
                >
                  <div>
                    <label htmlFor="login-email" className="block text-sm text-[var(--text-color-secondary)] mb-2 ml-1">Email Address</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-stone-500 group-focus-within:text-primary transition-colors" />
                      </div>
                      <input
                        id="login-email"
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-foreground placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="login-password" className="block text-sm text-[var(--text-color-secondary)] mb-2 ml-1">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-stone-500 group-focus-within:text-primary transition-colors" />
                      </div>
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-foreground placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-medium flex items-center animate-shake">
                      <span className="mr-2">⚠️</span> {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="cursor-pointer w-full flex justify-center py-4 px-4 text-sm font-bold rounded-2xl text-[var(--text-color-dark)] bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>
              </TabPanel>

              <TabPanel className="focus:outline-none">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleAuth('signup'); }} 
                  className="space-y-5"
                >
                  <div>
                    <label htmlFor="register-email" className="block text-sm text-[var(--text-color-secondary)] mb-2 ml-1">Email Address</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-stone-500 group-focus-within:text-primary transition-colors" />
                      </div>
                      <input
                        id="register-email"
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-foreground placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="register-password" className="block text-sm text-[var(--text-color-secondary)] mb-2 ml-1">Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-stone-500 group-focus-within:text-primary transition-colors" />
                      </div>
                      <input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/5 rounded-2xl text-foreground placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                        placeholder="Min 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="register-confirm-password" className="block text-sm text-[var(--text-color-secondary)] mb-2 ml-1">Confirm Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className={`h-5 w-5 transition-colors ${passwordMismatch ? 'text-rose-400' : 'text-stone-500 group-focus-within:text-primary'}`} />
                      </div>
                      <input
                        id="register-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`block w-full pl-11 pr-12 py-3.5 bg-white/5 border rounded-2xl text-foreground placeholder-stone-600 focus:outline-none focus:ring-2 transition-all ${
                          passwordMismatch
                            ? 'border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500/50'
                            : 'border-white/5 focus:ring-primary/40 focus:border-primary/40'
                        }`}
                        placeholder="Repeat password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {(error || passwordMismatch) && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm font-medium flex items-center">
                      <span className="mr-2">⚠️</span>
                      {passwordMismatch ? 'Passwords do not match' : error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="cursor-pointer w-full flex justify-center py-4 px-4 text-sm font-bold rounded-2xl text-[var(--text-color-dark)] bg-primary hover:bg-primary/90 focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>
              </TabPanel>
            </TabPanels>
          </TabGroup>

          <div className="mt-5 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-stone-500 hover:text-primary transition-colors font-medium"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-stone-400">
          By continuing, you agree to Fitly&apos;s{' '}
          <a href="#" className="font-semibold text-stone-200 hover:text-primary transition-colors">Terms of Service</a> and{' '}
          <a href="#" className="font-semibold text-stone-200 hover:text-primary transition-colors">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
