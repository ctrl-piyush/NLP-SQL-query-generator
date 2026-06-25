export default function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-surface-border rounded-lg" />
          <div className="h-6 w-16 bg-surface-border rounded-lg" />
          <div className="h-6 w-14 bg-surface-border rounded-lg" />
        </div>
        <div className="h-4 w-3/4 bg-surface-border/60 rounded" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-border pb-0">
        {[80, 90, 70, 90, 70].map((w, i) => (
          <div key={i} className={`h-9 w-${w < 80 ? "16" : "20"} bg-surface-border/40 rounded-t-lg`} style={{ width: w }} />
        ))}
      </div>

      {/* Code blocks */}
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-surface-border overflow-hidden">
            <div className="h-10 bg-surface-border/40 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-surface-border" />
                <div className="w-3 h-3 rounded-full bg-surface-border" />
                <div className="w-3 h-3 rounded-full bg-surface-border" />
              </div>
              <div className="h-3 w-24 bg-surface-border rounded ml-2" />
            </div>
            <div className="bg-[#13131f] p-4 space-y-2">
              <div className="h-3 w-full bg-surface-border/30 rounded" />
              <div className="h-3 w-4/5 bg-surface-border/30 rounded" />
              <div className="h-3 w-2/3 bg-surface-border/30 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-surface-card rounded-xl border border-surface-border p-4 space-y-2">
            <div className="h-3 w-20 bg-surface-border rounded" />
            <div className="h-6 w-16 bg-surface-border/60 rounded" />
            <div className="h-3 w-12 bg-surface-border/30 rounded" />
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-600 animate-pulse-slow">
        Groq is generating your SQL queries…
      </p>
    </div>
  );
}
