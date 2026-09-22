import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, variant = "default", ...props }: React.ComponentProps<"div"> & { variant?: "default" | "premium" | "glass" | "subtle" }) {
  const variantStyles = {
    default: "bg-card text-card-foreground border border-border/60 shadow-sm",
    premium: "bg-gradient-to-br from-card to-card/90 text-card-foreground border border-primary/20 shadow-md ring-1 ring-primary/10",
    glass: "bg-card/70 backdrop-blur-md text-card-foreground border border-border/40 shadow-sm",
    subtle: "bg-muted/40 text-card-foreground border border-transparent shadow-none"
  }

  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-2xl py-6 transition-all duration-200",
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-bold tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm leading-relaxed", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
