"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

let collapsibleIdCounter = 0

interface CollapsibleProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  id?: string
}

interface CollapsibleContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentId: string
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | undefined>(undefined)

function useCollapsible() {
  const context = React.useContext(CollapsibleContext)
  if (!context) {
    throw new Error("useCollapsible must be used within a Collapsible")
  }
  return context
}

const Collapsible: React.FC<CollapsibleProps> = ({ 
  children, 
  open: controlledOpen, 
  onOpenChange,
  defaultOpen = false,
  id
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const [contentId] = React.useState(() => id || `collapsible-content-${++collapsibleIdCounter}`)
  
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }, [isControlled, onOpenChange])

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange, contentId }}>
      {children}
    </CollapsibleContext.Provider>
  )
}

interface CollapsibleTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

const CollapsibleTrigger: React.FC<CollapsibleTriggerProps> = ({ children, asChild }) => {
  const { open, onOpenChange, contentId } = useCollapsible()
  
  const handleClick = () => {
    onOpenChange(!open)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void; "aria-expanded"?: boolean; "aria-controls"?: string }>, {
      onClick: handleClick,
      "aria-expanded": open,
      "aria-controls": contentId,
    })
  }

  return (
    <button type="button" onClick={handleClick} aria-expanded={open} aria-controls={contentId}>
      {children}
    </button>
  )
}

interface CollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

const CollapsibleContent: React.FC<CollapsibleContentProps> = ({ children, className }) => {
  const { open, contentId } = useCollapsible()
  
  return (
    <div
      id={contentId}
      role="region"
      aria-live="polite"
      className={cn(
        "overflow-hidden transition-all duration-300",
        open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
        className
      )}
    >
      {children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
