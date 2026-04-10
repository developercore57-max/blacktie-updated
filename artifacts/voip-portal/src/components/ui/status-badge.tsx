import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "suspended" | "pending" | "cancelled" | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStyles = () => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "suspended":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "cancelled":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "pending":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider",
        getStyles(),
        className
      )}
    >
      {status}
    </span>
  );
}
