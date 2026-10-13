import { MessageActions } from "@/components/ui/message-actions";

export default function MessageActionsDemo() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-1.5 px-4 pt-28 pb-10">
      <p className="text-foreground text-sm leading-6">
        The staging build ran out of memory. Raise the build memory limit, then
        redeploy.
      </p>
      <MessageActions
        density="comfortable"
        text="The staging build ran out of memory. Raise the build memory limit, then redeploy."
      />
    </div>
  );
}
