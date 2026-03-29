import { Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

const sizeMap = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
  xl: "size-12",
}

type SpinnerSize = keyof typeof sizeMap

interface SpinnerProps extends Omit<React.ComponentProps<"svg">, "size"> {
  size?: SpinnerSize
}

function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("animate-spin", sizeMap[size], className)}
      {...props}
    />
  )
}

export { Spinner }
