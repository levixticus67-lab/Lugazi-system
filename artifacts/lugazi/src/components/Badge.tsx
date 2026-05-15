import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  muted: "bg-muted text-muted-foreground",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", variantClasses[variant], className)}>
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    pending: "warning",
    approved: "success",
    rejected: "danger",
    active: "success",
    inactive: "danger",
    draft: "muted",
    submitted: "info",
    reviewed: "success",
    new_contact: "muted",
    first_visit: "info",
    following_up: "warning",
    committed: "success",
    member: "default",
  };
  return <Badge variant={map[status] ?? "muted"}>{status.replace(/_/g, " ")}</Badge>;
}
