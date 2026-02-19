import { Badge } from "@/components/ui/badge";
import { ModeToggle } from "@/components/mode-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 items-center pl-6 pr-6 md:pl-8 md:pr-8 max-w-7xl mx-auto">
        <div className="flex gap-2 items-center">
          <span className="text-lg font-bold">Lucky Bot</span>
          <Badge variant="secondary" className="text-xs font-normal">
            Lottery
          </Badge>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
