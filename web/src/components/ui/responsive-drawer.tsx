import * as React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

const ResponsiveDrawerContext = React.createContext<{ isDesktop: boolean }>({
  isDesktop: true,
});

export function ResponsiveDrawer({
  children,
  ...props
}: React.ComponentProps<typeof Dialog>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <ResponsiveDrawerContext.Provider value={{ isDesktop }}>
      {isDesktop ? (
        <Dialog {...props}>{children}</Dialog>
      ) : (
        <Drawer.Root repositionInputs={false} {...props}>
          {children}
        </Drawer.Root>
      )}
    </ResponsiveDrawerContext.Provider>
  );
}

export function ResponsiveDrawerTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const { isDesktop } = React.useContext(ResponsiveDrawerContext);

  if (isDesktop) {
    return <DialogTrigger className={className} {...props} />;
  }

  return <Drawer.Trigger className={className} {...props} />;
}

export function ResponsiveDrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const { isDesktop } = React.useContext(ResponsiveDrawerContext);

  if (isDesktop) {
    return (
      <DialogContent className={className} {...props}>
        {children}
      </DialogContent>
    );
  }

  return (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
      <Drawer.Content
        className={cn(
          "bg-background flex flex-col rounded-t-[10px] mt-24 h-fit fixed bottom-0 left-0 right-0 z-50 outline-none",
          className,
        )}
        {...props}
      >
        <div className="p-6 bg-background rounded-t-[10px] flex-1 flex flex-col gap-4">
          <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-muted mb-4" />
          {children}
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  );
}

export function ResponsiveDrawerHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isDesktop } = React.useContext(ResponsiveDrawerContext);

  if (isDesktop) {
    return <DialogHeader className={className} {...props} />;
  }

  return (
    <div
      className={cn("grid gap-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

export function ResponsiveDrawerFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isDesktop } = React.useContext(ResponsiveDrawerContext);

  if (isDesktop) {
    return <DialogFooter className={className} {...props} />;
  }

  return (
    <div className={cn("mt-auto flex flex-col gap-2", className)} {...props} />
  );
}

export function ResponsiveDrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const { isDesktop } = React.useContext(ResponsiveDrawerContext);

  if (isDesktop) {
    return <DialogTitle className={className} {...props} />;
  }

  return (
    <Drawer.Title
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

export function ResponsiveDrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const { isDesktop } = React.useContext(ResponsiveDrawerContext);

  if (isDesktop) {
    return <DialogDescription className={className} {...props} />;
  }

  return (
    <Drawer.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}
