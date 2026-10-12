// The only client script outside demo islands: copy buttons, install tabs,
// the variant switcher and the demo direction toggle. Progressive: without
// it, the default variant and the first tab are fully readable.

const live = () => document.getElementById("live-region");

function announce(message: string) {
  const region = live();
  if (region) {
    region.textContent = "";
    window.setTimeout(() => {
      region.textContent = message;
    }, 50);
  }
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

document.addEventListener("click", async (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>(
    "button[data-copy], button[data-copy-target]",
  );
  if (!button) {
    return;
  }
  const targetId = button.dataset.copyTarget;
  const text = targetId
    ? (document.getElementById(targetId)?.textContent ?? "")
    : (button.dataset.copy ?? "");
  const ok = await writeClipboard(text);
  const label = button.querySelector<HTMLElement>("[data-copy-label]");
  const original = label?.dataset.original ?? label?.textContent ?? "Copy";
  if (label) {
    label.dataset.original = original;
    label.textContent = ok ? "Copied" : "Copy failed";
  }
  button.dataset.copied = ok ? "true" : "false";
  announce(ok ? "Copied to clipboard" : "Copy failed");
  window.setTimeout(() => {
    if (label) {
      label.textContent = original;
    }
    delete button.dataset.copied;
  }, 1600);
});

// Tabs (WAI-ARIA tabs pattern: arrows, Home, End; automatic activation).
for (const root of document.querySelectorAll<HTMLElement>("[data-tabs]")) {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const select = (tab: HTMLButtonElement, focus: boolean) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(
        t.getAttribute("aria-controls") ?? "",
      );
      if (panel) {
        panel.hidden = !on;
      }
    }
    if (focus) {
      tab.focus();
    }
  };
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => select(tab, false));
    tab.addEventListener("keydown", (event) => {
      const last = tabs.length - 1;
      const rtl = getComputedStyle(root).direction === "rtl";
      const next = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[
        event.key
      ];
      let to: number | null = null;
      if (next !== undefined) {
        to = (index + next + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        to = 0;
      } else if (event.key === "End") {
        to = last;
      }
      if (to !== null) {
        event.preventDefault();
        select(tabs[to], true);
      }
    });
  }
}

// Variant switcher.
const root = document.getElementById("variant-root");
if (root) {
  type Cell = { name: string; primitive: string; icons: string; style: string };
  const matrix: Cell[] = JSON.parse(root.dataset.matrix ?? "[]");
  const inputs = [
    ...root.querySelectorAll<HTMLInputElement>("input[data-dimension]"),
  ];
  const sections = [...root.querySelectorAll<HTMLElement>("[data-variant]")];
  const unavailable = root.querySelector<HTMLElement>("[data-unavailable]");

  const current = () => {
    const pick: Record<string, string> = {};
    for (const input of inputs) {
      if (input.checked) {
        pick[input.dataset.dimension ?? ""] = input.value;
      }
    }
    return pick;
  };
  const match = (pick: Record<string, string>) =>
    matrix.find((cell) =>
      Object.entries(pick).every(
        ([key, value]) => cell[key as keyof Cell] === value,
      ),
    );
  const show = (name: string | null, updateUrl: boolean) => {
    for (const section of sections) {
      section.hidden = section.dataset.variant !== name;
    }
    if (unavailable) {
      unavailable.hidden = name !== null;
    }
    root.dataset.selected = name ?? "";
    if (updateUrl) {
      const url = new URL(window.location.href);
      if (name && name !== root.dataset.default) {
        url.searchParams.set("variant", name);
      } else {
        url.searchParams.delete("variant");
      }
      history.replaceState(null, "", url);
    }
  };
  const setFrom = (cell: Cell) => {
    for (const input of inputs) {
      const key = input.dataset.dimension as keyof Cell;
      input.checked = cell[key] === input.value;
    }
  };

  for (const input of inputs) {
    input.addEventListener("change", () => {
      const cell = match(current());
      show(cell?.name ?? null, true);
      announce(
        cell ? `Showing ${cell.name}` : "This combination is not yet available",
      );
    });
  }
  const requested = new URL(window.location.href).searchParams.get("variant");
  const initial = matrix.find((cell) => cell.name === requested);
  if (initial) {
    setFrom(initial);
    show(initial.name, false);
  }

  for (const input of root.querySelectorAll<HTMLInputElement>(
    "input[data-direction]",
  )) {
    input.addEventListener("change", () => {
      for (const frame of root.querySelectorAll<HTMLElement>(
        "[data-demo-frame]",
      )) {
        frame.dir = input.value;
      }
    });
  }
}
