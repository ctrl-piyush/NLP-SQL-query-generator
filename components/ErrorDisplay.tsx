import { AlertCircle, ExternalLink, RefreshCw } from "lucide-react";

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
}

export default function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const isApiKeyError = error.toLowerCase().includes("api_key") || error.toLowerCase().includes("groq_api_key");

  return (
    <div className="rounded-xl border border-accent-red/30 bg-accent-red/5 p-5 animate-fade-in">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="text-accent-red flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-accent-red mb-1">
            {isApiKeyError ? "API Key Required" : "Generation Failed"}
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">{error}</p>

          {isApiKeyError && (
            <div className="mt-3 p-3 bg-surface-border/30 rounded-lg">
              <p className="text-xs text-gray-300 font-medium mb-2">Setup instructions:</p>
              <ol className="text-xs text-gray-400 space-y-1.5 list-decimal ml-4">
                <li>
                  Get a free API key from{" "}
                  <a
                    href="https://console.groq.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-400 hover:underline inline-flex items-center gap-1"
                  >
                    console.groq.com <ExternalLink size={10} />
                  </a>
                </li>
                <li>Create a <code className="bg-surface-border px-1 rounded">.env.local</code> file in the project root</li>
                <li>Add: <code className="bg-surface-border px-1 rounded">GROQ_API_KEY=your_key_here</code></li>
                <li>Restart the development server</li>
                <li>On Vercel: add the environment variable in Project Settings</li>
              </ol>
            </div>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-accent-red/10 hover:bg-accent-red/20 text-accent-red text-xs rounded-lg transition-colors"
            >
              <RefreshCw size={12} />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
