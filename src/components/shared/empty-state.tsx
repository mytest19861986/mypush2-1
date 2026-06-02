import * as React from "react"
import { Inbox } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type LegacyEmptyStateAction = {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

type LegacyEmptyStateProps = Omit<EmptyStateProps, "icon" | "action"> & {
  icon?: React.ElementType
  action?: LegacyEmptyStateAction
}

type EmptyStateIcon = EmptyStateProps["icon"] | LegacyEmptyStateProps["icon"]
type EmptyStateAction = EmptyStateProps["action"] | LegacyEmptyStateProps["action"]

function isLegacyAction(action: EmptyStateAction): action is LegacyEmptyStateAction {
  return (
    typeof action === "object" &&
    action !== null &&
    !React.isValidElement(action) &&
    "label" in action &&
    "onClick" in action
  )
}

function isIconComponent(icon: EmptyStateIcon): icon is React.ElementType {
  return (
    typeof icon === "function" ||
    (typeof icon === "object" &&
      icon !== null &&
      !React.isValidElement(icon) &&
      "$$typeof" in icon)
  )
}

function renderIcon(icon: EmptyStateIcon) {
  if (!icon) {
    return <Inbox />
  }

  if (isIconComponent(icon)) {
    const Icon = icon
    return <Icon />
  }

  return icon
}

export function EmptyState(props: EmptyStateProps): React.JSX.Element
export function EmptyState(props: LegacyEmptyStateProps): React.JSX.Element
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps | LegacyEmptyStateProps) {
  const renderedAction = isLegacyAction(action) ? (
    <Button onClick={action.onClick} variant="outline">
      {action.label}
    </Button>
  ) : (
    action
  )

  return (
    <Card
      className={cn(
        "items-center justify-center rounded-2xl border bg-card px-6 py-12 text-center text-muted-foreground shadow-none",
        className
      )}
      dir="rtl"
    >
      <div
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground [&_svg]:size-7 [&_svg]:shrink-0"
      >
        {renderIcon(icon)}
      </div>
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-md text-sm leading-6">{description}</p>
        ) : null}
      </div>
      {renderedAction ? <div>{renderedAction}</div> : null}
    </Card>
  )
}
