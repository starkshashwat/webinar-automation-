"use client"

import * as React from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

const DialogContext = React.createContext<{ open: boolean; setOpen: (o: boolean) => void } | null>(null)

function Dialog({ open: controlledOpen, onOpenChange, children }: DialogProps) {
    const [uncontrolled, setUncontrolled] = React.useState(false)
    const open = controlledOpen ?? uncontrolled
    const setOpen = (o: boolean) => {
        if (onOpenChange) onOpenChange(o)
        if (controlledOpen === undefined) setUncontrolled(o)
    }
    return (
        <DialogContext.Provider value={{ open, setOpen }}>
            {children}
        </DialogContext.Provider>
    )
}

function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
    const ctx = React.useContext(DialogContext)
    if (!ctx || !ctx.open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black/50"
                onClick={() => ctx.setOpen(false)}
            />
            <div
                data-slot="dialog-content"
                className={cn(
                    "relative z-50 grid w-full max-w-lg gap-4 rounded-xl border bg-background p-6 shadow-lg",
                    className
                )}
            >
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-4 top-4"
                    onClick={() => ctx.setOpen(false)}
                >
                    <X className="size-4" />
                </Button>
                {children}
            </div>
        </div>
    )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("flex flex-col gap-1.5 text-left", className)} {...props} />
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
    return <h2 className={cn("text-lg font-semibold leading-none", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
    return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription }
