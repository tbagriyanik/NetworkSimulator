"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("relative overflow-auto custom-scrollbar min-h-0 min-w-0", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function ScrollBar(_props: React.HTMLAttributes<HTMLDivElement> & { orientation?: "vertical" | "horizontal" }) {
  return null
}

export { ScrollArea, ScrollBar }
