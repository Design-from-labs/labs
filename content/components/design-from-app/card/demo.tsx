import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Demo() {
  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Brand sprint</CardTitle>
        <CardDescription>A two-week engagement.</CardDescription>
        <CardAction>
          <Button aria-label="More actions" size="sm" variant="ghost">
            ⋯
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Five working sessions, a visual direction, and a leave-behind contract.
      </CardContent>
      <CardFooter>
        <Button>View artifact</Button>
      </CardFooter>
    </Card>
  );
}
