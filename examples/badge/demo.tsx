import { Badge } from "@/components/ui/badge";

export default function BadgeDemo() {
  return (
    <div className="flex max-w-sm flex-wrap items-center justify-center gap-2">
      <Badge>Draft</Badge>
      <Badge tone="info">In review</Badge>
      <Badge tone="success">Deployed</Badge>
      <Badge tone="warning">Degraded</Badge>
      <Badge tone="danger">Failed</Badge>
    </div>
  );
}
