const body = document.querySelector<HTMLElement>("[data-article-body]");
const toc = document.querySelector<HTMLDetailsElement>("[data-toc]");
const layout = document.querySelector<HTMLElement>(".article-layout");
if (toc && layout) {
  const wide = () =>
    layout.clientWidth >= 55 * parseFloat(getComputedStyle(document.documentElement).fontSize);
  toc.open = wide();
  let wasWide = wide();
  new ResizeObserver(() => {
    if (wide() !== wasWide) {
      wasWide = wide();
      toc.open = wasWide;
    }
  }).observe(layout);
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
for (const pre of body?.querySelectorAll<HTMLPreElement>(`pre:not(${diagramSelector})`) ?? []) {
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
  toolbar.append(label, status, button);
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
