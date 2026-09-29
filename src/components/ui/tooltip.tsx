"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function TooltipProvider({ children }: { children?: React.ReactNode; delayDuration?: number }) {
  return <>{children}</>
}

interface TooltipContextValue {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const TooltipContext = React.createContext<TooltipContextValue>({ open: false, setOpen: () => {} })

export interface TooltipProps {
  children?: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  delayDuration?: number
  onOpenChange?: (open: boolean) => void
}

function Tooltip({ children }: TooltipProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

function TooltipTrigger({ className, children, asChild: _asChild, ...props }: React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) {
  return (
    <div className={cn("inline-block", className)} {...props}>
      {children}
    </div>
  )
}

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "bottom" | "left" | "right" | string;
  sideOffset?: number;
  hideArrow?: boolean;
}

function TooltipContent({
  className,
  side = "top",
  sideOffset: _sideOffset = 4,
  hideArrow: _hideArrow = false,
  children,
  ...props
}: TooltipContentProps) {
  const { open } = React.useContext(TooltipContext)

  if (!open) return null

  const sideClasses =
    side === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 mt-1.5"
      : side === "left"
      ? "right-full top-1/2 -translate-y-1/2 mr-1.5"
      : side === "right"
      ? "left-full top-1/2 -translate-y-1/2 ml-1.5"
      : "bottom-full left-1/2 -translate-x-1/2 mb-1.5"

  return (
    <div
      data-slot="tooltip-content"
      className={cn(
        "absolute z-[10001] w-fit whitespace-nowrap rounded-lg border border-border/50 bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md transition-all duration-150 dark:border-secondary-700 dark:shadow-[0_2px_6px_rgba(255,255,255,0.03)] liquid-glass-light tooltip-framed pointer-events-none",
        sideClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
