import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export default function ButtonDemo() {
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          loading={saving}
          onClick={() => {
            setSaving(true);
            timer.current = setTimeout(() => setSaving(false), 1500);
          }}
        >
          {saving ? "Saving" : "Save changes"}
        </Button>
        <Button variant="outline" loading>
          Loading
        </Button>
        <Button variant="destructive" size="sm">
          Delete
        </Button>
      </div>
    </div>
  );
}
