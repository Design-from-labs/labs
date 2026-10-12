import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const trigger =
  "inline-flex h-9 items-center rounded-md border border-input bg-background px-4 font-medium text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function TooltipDemo() {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Tooltip>
          <TooltipTrigger className={trigger}>Share</TooltipTrigger>
          <TooltipContent>Copies a link to this page</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className={trigger}>Below</TooltipTrigger>
          <TooltipContent side="bottom">
            Opens below, on hover or focus
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
