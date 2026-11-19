import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Heart,
  Lock,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail, validateFullName, validatePassword, validateUsername } from '../lib/validation';
import { ARCH_PHOTO_IMAGE, HERO_STUDIO_IMAGE } from '../services/demoSeed';
import { checkUsernameAvailability } from '../services/socialService';

export function AuthScreen() {
  const {
    firebaseUser,
    isEmailVerified,
    needsProfileSetup,
    enterPrototypeMode,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    logout,
    resendVerificationEmail,
    refreshVerificationStatus,
    completeProfileSetup,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState(firebaseUser?.displayName || '');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [providerDisabledNotice, setProviderDisabledNotice] = useState(false);

  // Case 1: Signed in via Email/Password, awaiting email verification
  if (firebaseUser && !isEmailVerified) {
    const handleCheckVerification = async () => {
      setLoading(true);
      setError(null);
      try {
        const verified = await refreshVerificationStatus();
        if (!verified) {
          setInfoMessage(
            'Your email is not verified yet. Please click the link in your inbox, then click Refresh Status.'
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to refresh status.');
      } finally {
        setLoading(false);
      }
    };

    const handleResend = async () => {
      setLoading(true);
      setError(null);
      try {
        await resendVerificationEmail();
        setInfoMessage(`Verification link sent to ${firebaseUser.email}.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resend verification email.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900">Verify your email</h1>
              <p className="text-xs text-zinc-500">ConnectSphere Security Gate</p>
            </div>
          </div>

          <p className="text-sm text-zinc-600 leading-relaxed mb-6">
            We sent a verification link to{' '}
            <span className="font-semibold text-zinc-900">{firebaseUser.email}</span>. Verified
            accounts ensure authentic community participation and protected database writes.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {infoMessage && (
            <div className="mb-4 p-3 rounded-lg bg-zinc-100 border border-zinc-200 text-xs text-zinc-700">
              {infoMessage}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleCheckVerification}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              I have verified my email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-zinc-200 text-zinc-800 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Resend verification email
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Sign out and use another account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Verified user completing initial profile setup
  if (firebaseUser && isEmailVerified && needsProfileSetup) {
    const handleCompleteSetup = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const nameErr = validateFullName(fullName);
      if (nameErr) {
        setError(nameErr);
        return;
      }
      const userErr = validateUsername(username);
      if (userErr) {
        setError(userErr);
        return;
      }

      setLoading(true);
      try {
        const available = await checkUsernameAvailability(username);
        if (!available) {
          setError('That username is already taken. Please choose another.');
          setLoading(false);
          return;
        }
        await completeProfileSetup(fullName.trim(), username.trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to create profile.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
              Finish your ConnectSphere profile
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              Choose how your name and handle appear across posts and messages.
            </p>
          </div>

          <form onSubmit={handleCompleteSetup} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Rivera"
                maxLength={80}
                required
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="alex_rivera"
                  maxLength={30}
                  required
                  className="w-full pl-8 pr-3.5 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                3–30 characters using letters, numbers, or underscores.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating profile...' : 'Enter ConnectSphere'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => void logout()}
              className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Case 3: Unauthenticated Editorial Showcase + Auth / Prototype Entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setProviderDisabledNotice(false);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    if (mode === 'register') {
      const nameErr = validateFullName(fullName);
      if (nameErr) {
        setError(nameErr);
        return;
      }
      const userErr = validateUsername(username);
      if (userErr) {
        setError(userErr);
        return;
      }
      const passErr = validatePassword(password);
      if (passErr) {
        setError(passErr);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await registerWithEmail({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          username: username.trim(),
        });
      } else {
        await loginWithEmail(email.trim(), password);
      }
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setProviderDisabledNotice(true);
        setError(
          'Email/Password sign-in is not enabled in this Firebase project yet. Enable it in Firebase Console or continue with Google Sign-In or the Interactive Prototype below.'
        );
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setProviderDisabledNotice(false);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code !== 'auth/popup-closed-by-user') {
        setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-12">
      {/* Left Visual Editorial Panel */}
      <div className="lg:col-span-6 relative bg-zinc-950 text-white overflow-hidden flex flex-col justify-between p-8 sm:p-12 lg:p-14">
        <img
          src={HERO_STUDIO_IMAGE}
          alt="ConnectSphere studio workspace"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/60" />

        <div className="relative z-10 flex items-center justify-between">
          <span className="text-xl font-display font-bold tracking-tight">ConnectSphere</span>
          <button
            type="button"
            onClick={enterPrototypeMode}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-zinc-900 text-xs font-semibold rounded-lg"
          >
            <span>Try prototype</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative z-10 my-10 lg:my-0 space-y-6 max-w-lg">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-display font-bold tracking-tight leading-[1.12] mb-4">
              A calmer place to share craft, ideas, and real conversation.
            </h1>
            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
              Publish photography and notes, follow thoughtful creators, join focused threads, and message directly without algorithmic noise.
            </p>
          </div>

          {/* Editorial Feed Card Preview */}
          <div className="bg-white text-zinc-900 rounded-2xl border border-zinc-800/40 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-zinc-900 text-white text-xs font-display font-semibold flex items-center justify-center">
                  MC
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900">Marcus Chen</p>
                  <p className="text-[11px] text-zinc-500">@marcus_chen &middot; 32m ago</p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-zinc-400">Preview</span>
            </div>
            <p className="text-xs text-zinc-700 leading-relaxed mb-3">
              Morning shadow study outside the gallery courtyard. Waiting twenty minutes for a single silhouette changes the entire frame.
            </p>
            <div className="rounded-xl overflow-hidden border border-zinc-200 h-40">
              <img
                src={ARCH_PHOTO_IMAGE}
                alt="Architectural courtyard preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center gap-5 mt-3 pt-2.5 border-t border-zinc-100 text-xs text-zinc-500 font-mono-num">
              <span className="inline-flex items-center gap-1 text-red-600">
                <Heart className="w-3.5 h-3.5 fill-red-600" />
                18
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                2
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Firebase Auth & Firestore Security Rules
          </span>
          <span aria-hidden="true">&middot;</span>
          <span>Real-time Sync</span>
        </div>
      </div>

      {/* Right Authentication & Prototype Entry */}
      <div className="lg:col-span-6 flex items-center justify-center p-6 sm:p-12 bg-zinc-50">
        <div className="w-full max-w-md space-y-4">
          {/* Interactive Prototype Quick-Launch Card */}
          <div className="bg-zinc-900 text-white rounded-2xl p-5 border border-zinc-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-display font-bold">Explore Interactive Prototype</h2>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Step right into a populated ConnectSphere workspace as Maya Lin (@maya_lin) with live posts, comments, likes, follows, and direct messages.
                </p>
              </div>
              <Compass className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
            </div>
            <button
              type="button"
              onClick={enterPrototypeMode}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <span>Launch Interactive Prototype</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Firebase Auth Card */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-display font-bold text-zinc-900">
                  {mode === 'login' ? 'Sign in with account' : 'Create live account'}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Persisted directly to Cloud Firestore
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setProviderDisabledNotice(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'login'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setProviderDisabledNotice(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'register'
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-900 hover:bg-zinc-50 transition-colors disabled:opacity-50 mb-4"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative flex items-center py-2 mb-4">
              <div className="flex-grow border-t border-zinc-200" />
              <span className="shrink-0 mx-3 text-xs text-zinc-400">or email and password</span>
              <div className="flex-grow border-t border-zinc-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                  {error}
                  {providerDisabledNotice && (
                    <div className="mt-2 pt-2 border-t border-red-200 text-red-800">
                      Enable Email/Password in Firebase Console &rarr; Authentication &rarr; Sign-in
                      method for project <code className="font-mono">premium-artwork-k5fd2</code>.
                    </div>
                  )}
                </div>
              )}

              {mode === 'register' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Full name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Rivera"
                      maxLength={80}
                      required
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      placeholder="alex_rivera"
                      maxLength={30}
                      required
                      className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    maxLength={254}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-10 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'register' && (
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Min 8 chars, uppercase, lowercase, and a number.
                  </p>
                )}
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Confirm password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
