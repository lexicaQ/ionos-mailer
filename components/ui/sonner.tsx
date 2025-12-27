"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={4000}
      visibleToasts={9}
      expand={true}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "oklch(0.95 0 0)",
          "--normal-text": "hsl(var(--foreground))",
          "--normal-border": "hsl(var(--border))",
          "--success-bg": "oklch(0.95 0 0)",
          "--success-text": "hsl(var(--foreground))",
          "--success-border": "hsl(var(--foreground))",
          "--error-bg": "oklch(0.95 0 0)",
          "--error-text": "hsl(var(--foreground))",
          "--error-border": "hsl(var(--foreground))",
          "--warning-bg": "oklch(0.95 0 0)",
          "--warning-text": "hsl(var(--foreground))",
          "--warning-border": "hsl(var(--foreground))",
          "--info-bg": "oklch(0.95 0 0)",
          "--info-text": "hsl(var(--foreground))",
          "--info-border": "hsl(var(--foreground))",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "dark:!bg-[oklch(0.2_0_0)]",
        },
      }}
      closeButton
      {...props}
    />
  )
}

export { Toaster }
