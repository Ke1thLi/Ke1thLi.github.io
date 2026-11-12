const root = document.documentElement;
const desktopToggle = document.querySelector<HTMLButtonElement>("[data-sidebar-toggle]");
const drawerOpen = document.querySelector<HTMLButtonElement>("[data-drawer-open]");
const drawerClose = document.querySelector<HTMLButtonElement>("[data-drawer-close]");
const drawer = document.querySelector<HTMLDialogElement>("#navigation-drawer");
const desktop = window.matchMedia("(min-width: 56rem)");

function readPreference(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function savePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Navigation remains usable when storage is unavailable.
  }
}

function updateSidebarToggle() {
  if (!desktopToggle) return;
  const expanded = root.dataset.sidebar !== "collapsed";
  const label = expanded ? "Collapse sidebar" : "Expand sidebar";
  desktopToggle.setAttribute("aria-expanded", String(expanded));
  desktopToggle.setAttribute("aria-label", label);
  desktopToggle.title = label;
}

updateSidebarToggle();
desktopToggle?.addEventListener("click", () => {
  root.dataset.sidebar = root.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
  savePreference("ke1thli-sidebar", root.dataset.sidebar);
  updateSidebarToggle();
});

const navGroups = Array.from(document.querySelectorAll<HTMLDetailsElement>("[data-nav-group]"));
for (const group of navGroups) {
  const name = group.dataset.navGroup;
  const key = `ke1thli-sidebar-group-${name}`;
  group.open = readPreference(key) !== "closed";
  group.addEventListener("toggle", () => {
    savePreference(key, group.open ? "open" : "closed");
    for (const peer of navGroups) {
      if (peer.dataset.navGroup === name && peer.open !== group.open) peer.open = group.open;
    }
  });
}

drawerOpen?.addEventListener("click", () => drawer?.showModal());
drawerClose?.addEventListener("click", () => drawer?.close());
drawer?.addEventListener("click", (event) => {
  if (event.target === drawer) drawer.close();
});
drawer?.addEventListener("close", () => {
  if (desktop.matches) desktopToggle?.focus();
  else drawerOpen?.focus();
});
desktop.addEventListener("change", ({ matches }) => {
  if (matches && drawer?.open) drawer.close();
});
