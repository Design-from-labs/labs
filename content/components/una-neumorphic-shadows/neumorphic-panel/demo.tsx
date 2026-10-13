import { NeumorphicPanel } from "@/components/ui/neumorphic-panel";

// The pen's page: two panels on the panel's own surface with 3rem of padding
// and 3rem between them, the pen's raised panel and its pressed panel. The
// first is a toggle (it starts raised, as in the pen). The pen stacks them in
// a column; here they sit side by side when the stage is wide enough and
// stack when it is not, and `max-w-full` lets them shrink on a phone, which
// the pen's fixed 300px does not.
export default function NeumorphicPanelDemo() {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-12 bg-[var(--neumorphic-panel-surface,#e8eae9)] p-12">
      <NeumorphicPanel
        pressable
        aria-label="E8EAE9 panel"
        className="max-w-full"
      >
        E8EAE9
      </NeumorphicPanel>
      <NeumorphicPanel state="pressed" className="max-w-full">
        E8EAE9
      </NeumorphicPanel>
    </div>
  );
}
