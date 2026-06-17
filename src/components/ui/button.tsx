import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.97] shadow-[inset_0_-3px_0_rgba(0,0,0,0.28)] active:shadow-[inset_0_-2px_0_rgba(0,0,0,0.35)] before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/55 before:to-white/0 before:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-800 text-white shadow-xs hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 dark:hover:bg-secondary/60",
        ghost:
          "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 shadow-none before:hidden",
        link: "text-primary underline-offset-4 hover:underline shadow-none before:hidden",
        'glass-primary':
          "border-cyan-500/20 text-white shadow-cyan-500/5 bg-cyan-600/80 hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-cyan-500/15 backdrop-blur-md rounded-lg text-xs font-semibold",
        'glass-secondary':
          "border-slate-700/40 text-slate-300 shadow-slate-900/30 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-600 hover:text-white backdrop-blur-md rounded-lg text-xs font-semibold dark:bg-slate-900/60 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:border-slate-700",
        'glass-success':
          "border-emerald-500/20 text-white shadow-emerald-500/5 bg-emerald-600/80 hover:bg-emerald-500 hover:border-emerald-400 hover:shadow-emerald-500/15 backdrop-blur-md rounded-lg text-xs font-semibold",
        'glass-danger':
          "border-rose-500/20 text-white shadow-rose-500/5 bg-rose-600/80 hover:bg-rose-500 hover:border-rose-400 hover:shadow-rose-500/15 backdrop-blur-md rounded-lg text-xs font-semibold",
        'glass-warning':
          "border-amber-500/20 text-white shadow-amber-500/5 bg-amber-600/80 hover:bg-amber-500 hover:border-amber-400 hover:shadow-amber-500/15 backdrop-blur-md rounded-lg text-xs font-semibold",
        'glass-indigo':
          "border-indigo-500/20 text-white shadow-indigo-500/5 bg-indigo-600/80 hover:bg-indigo-500 hover:border-indigo-400 hover:shadow-indigo-500/15 backdrop-blur-md rounded-lg text-xs font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
export type { ButtonProps }
