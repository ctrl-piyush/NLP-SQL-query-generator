"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Database, Zap, Shield, Play, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  function validate(): string | null {
    if (!email || email.length > 254) {
      return "Email must be between 1 and 254 characters.";
    }
    if (!password || password.length < 8 || password.length > 128) {
      return "Password must be between 8 and 128 characters.";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.ok && !result.error) {
        router.push("/");
      } else {
        if (result?.error?.includes("locked")) {
          setError(result.error);
        } else {
          setError("Invalid email or password.");
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQuickDemo() {
    setError(null);
    setIsDemoLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: "demo@demo.com",
        password: "demo1234",
      });

      if (result?.ok && !result.error) {
        router.push("/");
      } else {
        setError("Demo login failed. Please try the manual credentials.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsDemoLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface bg-grid-pattern bg-grid-size px-4 py-12">
      <div className="w-full max-w-5xl animate-fade-in">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gradient mb-3">
            SQL Query Generator
          </h1>
          <p className="text-base text-gray-400 max-w-lg mx-auto">
            Convert natural language to optimized SQL queries instantly. Powered by AI.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: How It Works */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-8">
            <h2 className="text-lg font-semibold text-white mb-6">
              How It Works
            </h2>

            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0">
                  <Shield size={16} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">1. Sign in</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click &quot;Quick Demo&quot; for instant access, or sign in with your own account.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-accent-cyan/15 flex items-center justify-center flex-shrink-0">
                  <Database size={16} className="text-accent-cyan" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">2. Connect a database</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click <span className="text-accent-cyan font-medium">Try Demo DB</span> to explore with sample data, or connect your own MySQL/PostgreSQL.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-accent-amber/15 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-accent-amber" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">3. Describe what you need</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Type in plain English — e.g. &quot;Show all employees from India with salary above 50,000&quot;
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-accent-green/15 flex items-center justify-center flex-shrink-0">
                  <Play size={16} className="text-accent-green" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">4. Execute and explore</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Review generated SQL with explanations, impact analysis, and run queries directly.
                  </p>
                </div>
              </div>
            </div>

            {/* Features list */}
            <div className="mt-8 pt-6 border-t border-surface-border">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Features</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><Sparkles size={10} className="text-brand-400" /> AI-powered SQL</span>
                <span className="flex items-center gap-1.5"><Sparkles size={10} className="text-brand-400" /> Multiple alternatives</span>
                <span className="flex items-center gap-1.5"><Sparkles size={10} className="text-brand-400" /> Query explanations</span>
                <span className="flex items-center gap-1.5"><Sparkles size={10} className="text-brand-400" /> Impact analysis</span>
                <span className="flex items-center gap-1.5"><Sparkles size={10} className="text-brand-400" /> MySQL &amp; PostgreSQL</span>
                <span className="flex items-center gap-1.5"><Sparkles size={10} className="text-brand-400" /> Role-based access</span>
              </div>
            </div>
          </div>

          {/* Right Column: Login Form */}
          <div>
            {/* Quick Demo Button */}
            <button
              onClick={handleQuickDemo}
              disabled={isDemoLoading || isLoading}
              className="w-full mb-6 py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan/80 hover:from-brand-500 hover:to-accent-cyan/70 text-white font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-900/30"
            >
              {isDemoLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  <Play size={16} />
                  Quick Demo — Try It Now
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-surface text-gray-500">or sign in with your account</span>
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-surface-card border border-surface-border rounded-xl p-8">
              <form onSubmit={handleSubmit} noValidate>
                {error && (
                  <div
                    className="mb-6 p-3 rounded-lg bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm"
                    role="alert"
                    aria-live="polite"
                  >
                    {error}
                  </div>
                )}

                <div className="mb-5">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={254}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    disabled={isLoading || isDemoLoading}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface border border-surface-border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors disabled:opacity-50"
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    maxLength={128}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={isLoading || isDemoLoading}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface border border-surface-border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors disabled:opacity-50"
                  />
                  <p className="mt-1 text-xs text-gray-500">8–128 characters</p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isDemoLoading}
                  className="w-full py-2.5 px-4 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 focus:ring-offset-surface-card disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in…
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>
            </div>

            {/* Demo credentials note */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Demo account: <span className="font-mono text-gray-400">demo@demo.com</span> / <span className="font-mono text-gray-400">demo1234</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-8">
          Powered by Groq (Llama 3.3 70B) &middot; Supports MySQL &amp; PostgreSQL
        </p>
      </div>
    </div>
  );
}
