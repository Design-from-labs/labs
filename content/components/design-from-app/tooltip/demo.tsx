import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Demo() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover or focus me</Button>
        </TooltipTrigger>
        <TooltipContent>Keyboard-accessible tooltip</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
