import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

const LoadingSpinner = ({ size = "md", className, fullScreen = false }: LoadingSpinnerProps) => {
  const spinner = (
    <div className={cn("animate-spin rounded-full border-b-2 border-gold", sizeClasses[size], className)} />
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex justify-center py-16">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
