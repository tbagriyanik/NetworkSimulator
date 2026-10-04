"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "@/lib/cva"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    aria-live="polite"
    className={cn(
      "fixed bottom-12 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none flex max-h-[80vh] w-full flex-col items-center justify-end p-2 md:max-w-[420px] overflow-x-hidden gap-2",
      className
    )}
    style={{ zIndex: 999999, ...props.style }}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-xl border p-3.5 pr-8 shadow-2xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full liquid-glass-light",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground border-secondary-200 dark:border-secondary-800",
        destructive:
          "destructive group border-error-200 bg-error-50 text-error-900 dark:border-red-500/30 dark:bg-red-950/80 dark:text-red-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function ToastProgress({ duration }: { duration: number }) {
  const [progress, setProgress] = React.useState(100)

  React.useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      setProgress(Math.max(0, 100 - (elapsed / duration) * 100))
      if (elapsed < duration) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [duration])

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-foreground/10"
      style={{ marginInlineEnd: 0 }}
    >
      <div className="h-full bg-foreground/55" style={{ width: `${progress}%` }} />
    </div>
  )
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
  VariantProps<typeof toastVariants>
>(({ className, variant, duration, children, ...props }, ref) => {
  // Timed toasts (finite duration / auto-dismiss) show a shrinking progress bar.
  // It's rendered as the first child and is absolutely positioned, so the
  // flex/space layout is unaffected; `marginInlineEnd: 0` neutralizes space-x.
  const timed = duration !== Infinity
  const progressDuration = typeof duration === 'number' && isFinite(duration) ? duration : 5000
  return (
    <ToastPrimitives.Root
      ref={ref}
      {...(typeof duration === 'number' ? { duration } : {})}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      {timed && <ToastProgress duration={progressDuration} />}
      {children}
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 w-5 h-5 rounded-md bg-error-500 hover:bg-error-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0 focus:outline-none",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="w-3 h-3 text-white pointer-events-none" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
