"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Database, Zap, Shield, Play } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Client-side validation per Requirement 1.7
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface bg-grid-pattern bg-grid-size px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-2">
            SQL Query Generator
          </h1>
          <p className="text-sm text-gray-400">
            Convert natural language to SQL queries with AI
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-8 glow-brand">
          <form onSubmit={handleSubmit} noValidate>
            {/* Error Message */}
            {error && (
              <div
                className="mb-6 p-3 rounded-lg bg-accent-red/10 border border-accent-red/30 text-accent-red text-sm"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="mb-5">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
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
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg bg-surface border border-surface-border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
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
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg bg-surface border border-surface-border text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                8–128 characters
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 focus:ring-offset-surface-card disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Demo Credentials Hint */}
          <div className="mt-6 pt-5 border-t border-surface-border">
            <p className="text-xs text-gray-500 text-center mb-2">
              Want to try it out? Use the demo account:
            </p>
            <div className="bg-surface rounded-lg border border-surface-border p-3 text-center">
              <p className="text-xs font-mono text-gray-300">
                <span className="text-gray-500">Email:</span> admin@admin.com
              </p>
              <p className="text-xs font-mono text-gray-300 mt-0.5">
                <span className="text-gray-500">Password:</span> admin1234
              </p>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-8 bg-surface-card border border-surface-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4 text-center">
            How It Works
          </h2>
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-brand-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield size={14} className="text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">1. Sign in</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Use the demo credentials above or ask the admin to create your account.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-accent-cyan/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Database size={14} className="text-accent-cyan" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">2. Connect a database</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Click <span className="text-accent-cyan font-medium">Try Demo DB</span> to explore with sample data, or connect your own MySQL/PostgreSQL database.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-accent-amber/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap size={14} className="text-accent-amber" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">3. Describe what you need</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Type in plain English — e.g. &quot;Show all employees from India with salary above 50,000&quot;
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-accent-green/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Play size={14} className="text-accent-green" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">4. Execute and explore</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Review the generated SQL, see explanations, and execute queries against your connected database.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Powered by Groq LLM &middot; Supports MySQL &amp; PostgreSQL
        </p>
      </div>
    </div>
  );
}
