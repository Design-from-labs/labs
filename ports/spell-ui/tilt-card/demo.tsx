import { TiltCard } from "@/components/ui/tilt-card";

export default function TiltCardDemo() {
  return (
    <div className="flex min-h-[320px] w-full items-center justify-center">
      <TiltCard
        tiltLimit={10}
        scale={1.05}
        perspective={1200}
        className="flex aspect-video w-[360px] max-w-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-100 via-neutral-200 to-neutral-300 p-6 text-neutral-900 shadow-[0px_8px_16px_rgba(0,0,0,0.08),0px_16px_32px_rgba(0,0,0,0.06),0px_24px_48px_rgba(0,0,0,0.04),inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:from-neutral-800 dark:via-neutral-950 dark:to-neutral-900 dark:text-neutral-100 dark:shadow-[0px_8px_16px_rgba(0,0,0,0.3),0px_16px_32px_rgba(0,0,0,0.2),0px_24px_48px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(255,255,255,0.06)]"
      >
        <div className="flex items-start justify-between">
          <p className="font-medium text-sm">Labs pass</p>
          <p className="font-mono text-xs opacity-60">No. 0042</p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs opacity-60">Holder</p>
            <p className="font-medium text-sm tracking-tight">Ada Example</p>
          </div>
          <div className="text-end">
            <p className="text-xs opacity-60">Valid</p>
            <p className="font-medium font-mono text-sm tabular-nums">12/27</p>
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
