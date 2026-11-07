import * as React from "react"
import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  theme: themeProp,
  ...props
}) => {
  let activeTheme = "system"
  try {
    const nextTheme = useTheme()
    if (nextTheme?.theme) activeTheme = nextTheme.theme
  } catch {}
  if (themeProp) activeTheme = themeProp

  return (
    <Sonner
      theme={activeTheme}
      closeButton
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4 text-accent" />,
        info: <Info className="h-4 w-4 text-accent" />,
        warning: <TriangleAlert className="h-4 w-4 text-warning" />,
        error: <OctagonX className="h-4 w-4 text-destructive" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-pine-card group-[.toaster]:pr-9",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:!left-auto group-[.toast]:!right-2.5 group-[.toast]:!top-1/2 group-[.toast]:!-translate-y-1/2 group-[.toast]:!translate-x-0 group-[.toast]:!bg-transparent group-[.toast]:!border-0 group-[.toast]:!text-muted-foreground hover:group-[.toast]:!text-foreground hover:group-[.toast]:!bg-secondary/80 group-[.toast]:!rounded-md group-[.toast]:!w-6 group-[.toast]:!h-6",
        },
      }}
      {...props}
    />
  );
}

export { Toaster }
