import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
}

export function LoadingDisplay({
  text = "加载中...",
  className,
  ...props
}: LoadingDisplayProps) {
  return (
    <div
      className={cn(
        "flex-1 w-full flex flex-col items-center justify-center bg-background px-4 py-8 text-center",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center space-y-4 text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary/80" />
        {text && <p className="text-sm font-medium animate-pulse">{text}</p>}
      </div>
    </div>
  );
}
