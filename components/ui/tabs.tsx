"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface TabsContextValue {
    value: string
    setValue: (v: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function Tabs({
    defaultValue,
    value: controlledValue,
    onValueChange,
    className,
    children,
    ...props
}: React.ComponentProps<"div"> & {
    defaultValue?: string
    value?: string
    onValueChange?: (v: string) => void
}) {
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "")
    const value = controlledValue ?? uncontrolled
    const setValue = (v: string) => {
        if (onValueChange) onValueChange(v)
        if (controlledValue === undefined) setUncontrolled(v)
    }
    return (
        <TabsContext.Provider value={{ value, setValue }}>
            <div data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    )
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="tabs-list"
            className={cn(
                "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
                className
            )}
            {...props}
        />
    )
}

function TabsTrigger({ value, className, ...props }: React.ComponentProps<"button"> & { value: string }) {
    const ctx = React.useContext(TabsContext)
    if (!ctx) throw new Error("TabsTrigger must be used within Tabs")
    const active = ctx.value === value
    return (
        <button
            type="button"
            data-slot="tabs-trigger"
            data-state={active ? "active" : "inactive"}
            onClick={() => ctx.setValue(value)}
            className={cn(
                "inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
                active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                className
            )}
            {...props}
        />
    )
}

function TabsContent({ value, className, ...props }: React.ComponentProps<"div"> & { value: string }) {
    const ctx = React.useContext(TabsContext)
    if (!ctx) throw new Error("TabsContent must be used within Tabs")
    if (ctx.value !== value) return null
    return (
        <div
            data-slot="tabs-content"
            className={cn("flex-1 outline-none", className)}
            {...props}
        />
    )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
