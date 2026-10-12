// Stages: a layout part (sidebar, panel, sheet, header, toolbar...) shown in
// context, inside a neutral device frame and a skeleton app shell
// (docs/contract.md section 3, `stage`; docs/decisions/0015-layout-stages.md).
//
// A stage is an iframe of /stage/live/<item> (or /stage/still/<item> for the
// gallery tile) sized to the device's real viewport, so the component's own
// breakpoints apply, and scaled down to fit with CSS only.

export type Device = "desktop" | "laptop" | "tablet" | "phone" | "browser";
export type Slot =
  | "sidebar-start"
  | "sidebar-end"
  | "panel-end"
  | "sheet-bottom"
  | "header"
  | "footer"
  | "toolbar"
  | "overlay"
  | "inline";
export type Shell = "app" | "marketing" | "docs";

export interface StageMeta {
  device: Device;
  slot: Slot;
  shell?: Shell;
  height?: number;
}

export interface DeviceSpec {
  label: string;
  /** Viewport width in CSS pixels (the iframe's width). */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
}

/**
 * Viewports follow the site's breakpoints (Tailwind's defaults): the phone is
 * below `sm` (640), the tablet sits at `md` (768), the desktop sizes clear
 * `lg` (1024) and `xl` (1280).
 */
export const DEVICES: Record<Device, DeviceSpec> = {
  desktop: { label: "Desktop", width: 1440, height: 900 },
  laptop: { label: "Laptop", width: 1280, height: 800 },
  browser: { label: "Browser", width: 1280, height: 800 },
  tablet: { label: "Tablet", width: 768, height: 1024 },
  phone: { label: "Phone", width: 390, height: 844 },
};

/** The devices the component page's switcher offers, default first. */
export function switcherDevices(stage: StageMeta): Device[] {
  const base: Device[] = ["desktop", "tablet", "phone"];
  return [stage.device, ...base.filter((d) => d !== stage.device)];
}

/** The viewport of `device` for this stage (`height` applies to the default). */
export function viewport(stage: StageMeta, device: Device): DeviceSpec {
  const spec = DEVICES[device];
  return device === stage.device && stage.height
    ? { ...spec, height: stage.height }
    : spec;
}

export const stageSrc = (item: string, mode: "live" | "still") =>
  `/stage/${mode}/${item}`;
