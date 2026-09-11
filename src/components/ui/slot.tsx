import * as React from "react"
import { cn } from "@/lib/utils"

export const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>((props, ref) => {
  const { children, ...slotProps } = props
  if (React.isValidElement(children)) {
    const childProps = children.props as React.HTMLAttributes<HTMLElement>
    return React.cloneElement(children, {
      ...slotProps,
      ...childProps,
      className: cn(slotProps.className, childProps.className),
      ref,
    } as React.HTMLAttributes<HTMLElement>)
  }
  return null
})

Slot.displayName = "Slot"
