import { preferenceKey } from "../lib/preferences";

const body = document.querySelector<HTMLElement>("[data-article-body]");
const toc = document.querySelector<HTMLDetailsElement>("[data-toc]");
const layout = document.querySelector<HTMLElement>(".article-layout");
if (toc && layout) {
  const wide = () => getComputedStyle(layout).getPropertyValue("--toc-desktop").trim() === "1";
  let desktopOpen = true;
  try {
    desktopOpen = localStorage.getItem(preferenceKey("toc")) !== "collapsed";
  } catch {
    // The contents remain available without storage.
  }
  let wasWide = wide();
  toc.open = wasWide && desktopOpen;
  const syncToc = () => {
    const isWide = wide();
    if (isWide === wasWide) return;
    wasWide = isWide;
    toc.open = isWide && desktopOpen;
  };
  if (typeof ResizeObserver === "function") new ResizeObserver(syncToc).observe(layout);
  else addEventListener("resize", syncToc);
  toc.querySelector("summary")?.addEventListener("click", () => {
    if (!wide()) return;
    desktopOpen = !toc.open;
    try {
      localStorage.setItem(preferenceKey("toc"), desktopOpen ? "expanded" : "collapsed");
    } catch {
      // The preference still applies to the current page.
    }
  });
  const links = [...toc.querySelectorAll<HTMLAnchorElement>("a")];
  const headings = links.map((link) =>
    document.getElementById(decodeURIComponent(link.hash.slice(1))),
  );
  const update = () => {
    const offset =
      (document.querySelector(".shell-topbar")?.getBoundingClientRect().height ?? 56) + 24;
    let current = 0;
    for (const [index, heading] of headings.entries()) {
      if (heading && heading.getBoundingClientRect().top <= offset) current = index;
    }
    for (const [index, link] of links.entries()) {
      if (index === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  };
  let scheduled = false;
  window.addEventListener(
    "scroll",
    () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        update();
      });
    },
    { passive: true },
  );
  for (const link of links)
    link.addEventListener("click", () => {
      if (!wide()) toc.open = false;
    });
  update();
}

for (const table of body?.querySelectorAll("table") ?? []) {
  const wrapper = document.createElement("div");
  wrapper.className = "table-scroll";
  wrapper.tabIndex = 0;
  wrapper.setAttribute("role", "region");
  wrapper.setAttribute("aria-label", "Scrollable table");
  table.before(wrapper);
  wrapper.append(table);
}

const diagramSelector = "pre:has(> code.language-mermaid)";
const codeBlocks = [
  ...(body?.querySelectorAll<HTMLPreElement>(`pre:not(${diagramSelector})`) ?? []),
];
for (const [index, pre] of codeBlocks.entries()) {
  pre.tabIndex = 0;
  const source = pre.querySelector("code")?.textContent ?? "";
  const wrapper = document.createElement("div");
  wrapper.className = "code-example";
  const toolbar = document.createElement("div");
  toolbar.className = "code-toolbar";
  const label = document.createElement("span");
  label.textContent = pre.dataset.language || pre.dataset.lang || "Text";
  const button = document.createElement("button");
  button.className = "button";
  button.type = "button";
  button.textContent = "Copy";
  const status = document.createElement("span");
  status.setAttribute("role", "status");
  let reset: number | undefined;
  button.addEventListener("click", async () => {
    clearTimeout(reset);
    try {
      await navigator.clipboard.writeText(source);
      status.textContent = "Copied";
    } catch {
      status.textContent = "Unable to copy. Select the code to copy it manually.";
    }
    reset = window.setTimeout(() => {
      status.textContent = "";
    }, 2500);
  });
  label.className = "code-language";
  status.className = "code-status";
  const actions = document.createElement("div");
  actions.className = "code-actions";
  actions.append(button);
  if (source.trimEnd().split(/\r?\n/).length > 14) {
    pre.id ||= "article-code-block-" + (index + 1);
    const fold = document.createElement("button");
    fold.className = "button";
    fold.type = "button";
    fold.textContent = "Fold";
    fold.setAttribute("aria-expanded", "true");
    fold.setAttribute("aria-controls", pre.id);
    fold.addEventListener("click", () => {
      pre.hidden = !pre.hidden;
      fold.textContent = pre.hidden ? "Expand" : "Fold";
      fold.setAttribute("aria-expanded", String(!pre.hidden));
    });
    actions.prepend(fold);
  }
  const lines = pre.querySelectorAll<HTMLElement>("code > .line");
  for (const [lineIndex, line] of lines.entries()) {
    const number = document.createElement("span");
    number.className = "code-line-number";
    number.dataset.lineNumber = String(lineIndex + 1);
    number.setAttribute("aria-hidden", "true");
    line.prepend(number);
  }
  toolbar.append(label, status, actions);
  pre.before(wrapper);
  wrapper.append(toolbar, pre);
}

const lightbox = document.querySelector<HTMLDialogElement>("[data-lightbox]");
const enlarged = lightbox?.querySelector("img");
const caption = lightbox?.querySelector("figcaption");
let lightboxTrigger: HTMLButtonElement | undefined;
if (lightbox && enlarged && caption) {
  for (const image of body?.querySelectorAll("img") ?? []) {
    if (image.closest("a, button")) continue;
    const trigger = document.createElement("button");
    trigger.className = "image-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-label", image.alt ? `Enlarge image: ${image.alt}` : "Enlarge image");
    const paragraph = image.closest("p");
    const title = image.title;
    if (title && paragraph && !paragraph.textContent?.trim() && paragraph.children.length === 1) {
      const figure = document.createElement("figure");
      const description = document.createElement("figcaption");
      description.textContent = title;
      paragraph.replaceWith(figure);
      figure.append(image, description);
    }
    image.before(trigger);
    trigger.append(image);
    trigger.addEventListener("click", () => {
      lightboxTrigger = trigger;
      enlarged.src = image.currentSrc || image.src;
      enlarged.alt = image.alt;
      caption.textContent = title;
      lightbox.showModal();
    });
  }
  lightbox
    .querySelector("[data-lightbox-close]")
    ?.addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener("close", () => lightboxTrigger?.focus());
}

const diagrams = [...(body?.querySelectorAll<HTMLPreElement>(diagramSelector) ?? [])];
function loadDiagram(source: HTMLPreElement) {
  void import("./diagrams")
    .then(({ mountDiagram }) => mountDiagram(source))
    .catch((error: unknown) => console.error("Unable to load Mermaid", error));
}
if (diagrams.length > 0 && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLPreElement)) continue;
        observer.unobserve(entry.target);
        loadDiagram(entry.target);
      }
    },
    { rootMargin: "240px" },
  );
  for (const diagram of diagrams) observer.observe(diagram);
} else {
  for (const diagram of diagrams) loadDiagram(diagram);
}

const progress = document.querySelector<HTMLElement>("[data-reading-progress]");
if (progress && body) {
  let frame = 0;
  const update = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const bottom = body.getBoundingClientRect().bottom + scrollY;
      const distance = Math.max(0, bottom - innerHeight);
      const fraction = distance === 0 ? 1 : Math.min(1, Math.max(0, scrollY / distance));
      progress.style.transform = `scaleX(${fraction})`;
    });
  };
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  if (typeof ResizeObserver === "function") new ResizeObserver(update).observe(body);
  update();
}
