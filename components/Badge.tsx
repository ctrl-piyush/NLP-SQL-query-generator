import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline";
}

export default function Badge({ children, className, variant = "outline" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold font-mono border",
        variant === "outline" ? "border" : "border-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}
