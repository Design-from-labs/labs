import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";

const trigger =
  "inline-flex h-9 items-center rounded-md border border-input bg-background px-4 font-medium text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function TooltipDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <TooltipTrigger>
        <button type="button" className={trigger}>
          Share
        </button>
        <Tooltip>Copies a link to this page</Tooltip>
      </TooltipTrigger>
      <TooltipTrigger>
        <button type="button" className={trigger}>
          Below
        </button>
        <Tooltip placement="bottom">Opens below, on hover or focus</Tooltip>
      </TooltipTrigger>
    </div>
  );
}
