import * as React from "react"

import { cn } from "@/lib/utils"

function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success"
}) {
    const variants: Record<string, string> = {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border border-input text-foreground",
        success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    }
    return (
        <span
            data-slot="badge"
            className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                variants[variant],
                className
            )}
            {...props}
        />
    )
}

export { Badge }
