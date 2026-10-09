import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-background/50 backdrop-blur-sm px-2.5 py-2 text-base text-foreground transition-colors duration-150 outline-none placeholder:text-muted-foreground focus-visible:border-indigo-300/70 disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground disabled:opacity-60 aria-invalid:border-destructive md:text-sm dark:bg-input/30 dark:disabled:bg-muted/30 dark:aria-invalid:border-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
