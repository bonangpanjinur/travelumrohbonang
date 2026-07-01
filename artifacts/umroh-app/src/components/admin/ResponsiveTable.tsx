import { ReactNode } from "react";

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper for admin tables that adds horizontal scroll on mobile
 * and provides a clean card container
 */
const ResponsiveTable = ({ children, className = "" }: ResponsiveTableProps) => {
  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto -mx-0">
        {children}
      </div>
    </div>
  );
};

export default ResponsiveTable;

/**
 * Mobile card view for table data - use when tables have too many columns
 */
interface MobileCardProps {
  children: ReactNode;
  className?: string;
}

export const MobileCard = ({ children, className = "" }: MobileCardProps) => {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 space-y-3 ${className}`}>
      {children}
    </div>
  );
};

interface MobileCardRowProps {
  label: string;
  children: ReactNode;
}

export const MobileCardRow = ({ label, children }: MobileCardRowProps) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <div className="text-sm font-medium text-right">{children}</div>
    </div>
  );
};
