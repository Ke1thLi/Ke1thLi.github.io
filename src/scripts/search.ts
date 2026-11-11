type SearchItem = {
  url: string;
  meta: { title?: string; description?: string; category?: string; tags?: string };
};
type Pagefind = {
  options: (config: { baseUrl: string }) => Promise<void>;
  search: (query: string) => Promise<{ results: { data: () => Promise<SearchItem> }[] }>;
};

const opener = document.querySelector<HTMLButtonElement>("[data-search-open]");
const dialog = document.querySelector<HTMLDialogElement>("[data-search-dialog]");
const input = dialog?.querySelector<HTMLInputElement>("[data-search-input]");
const results = dialog?.querySelector<HTMLElement>("[data-search-results]");
const status = dialog?.querySelector<HTMLElement>("[data-search-status]");
const hint = opener?.parentElement?.querySelector("kbd");
if (hint && /Mac|iPhone|iPad/.test(navigator.platform)) hint.textContent = "⌘ K";

const base = import.meta.env.BASE_URL;
let engine: Promise<Pagefind | null> | undefined;

function getEngine() {
  engine ??= loadEngine().catch((error: unknown) => {
    engine = undefined;
    throw error;
  });
  return engine;
}

async function loadEngine(): Promise<Pagefind | null> {
  const directory = `${base}pagefind/`;
  const manifest = await fetch(`${directory}article-count.json`);
  if (!manifest.ok) throw new Error("Missing article search index");
  const count: unknown = await manifest.json();
  if (count === 0) return null;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) {
    throw new Error("Invalid article search index");
  }
  const moduleUrl = `${directory}pagefind.js`;
  const module: Pagefind = await import(/* @vite-ignore */ moduleUrl);
  await module.options({ baseUrl: base });
  return module;
}

function tagsLabel(raw?: string) {
  try {
    const tags: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(tags)
      ? tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => `#${tag}`)
          .join(" ")
      : "";
  } catch {
    return "";
  }
}

if (opener && dialog && input && results && status) {
  const button = opener;
  const modal = dialog;
  const queryInput = input;
  const list = results;
  const announcement = status;
  let previous: HTMLElement | null = null;
  let options: HTMLAnchorElement[] = [];
  let active = -1;
  let revision = 0;
  let timer: number | undefined;

  function select(index: number) {
    active = index;
    for (const [i, option] of options.entries())
      option.setAttribute("aria-selected", String(i === index));
    if (index >= 0) {
      queryInput.setAttribute("aria-activedescendant", options[index].id);
      options[index].scrollIntoView({ block: "nearest" });
    } else {
      queryInput.removeAttribute("aria-activedescendant");
    }
  }

  function open() {
    if (modal.open) return;
    previous = document.activeElement instanceof HTMLElement ? document.activeElement : button;
    modal.showModal();
    queryInput.focus();
  }

  button.addEventListener("click", open);
  document.addEventListener("keydown", (event) => {
    if (
      event.defaultPrevented ||
      event.repeat ||
      event.altKey ||
      event.shiftKey ||
      !(event.ctrlKey || event.metaKey) ||
      event.key.toLowerCase() !== "k"
    )
      return;
    if (
      event.target instanceof Element &&
      event.target.closest("input,textarea,select,[contenteditable]:not([contenteditable=false])")
    )
      return;
    if (document.querySelector("dialog[open]")) return;
    event.preventDefault();
    open();
  });
  modal.querySelector("[data-search-close]")?.addEventListener("click", () => modal.close());
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      modal.close();
    }
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
  modal.addEventListener("close", () => {
    const focused = document.activeElement;
    if (
      focused &&
      focused !== document.body &&
      focused !== document.documentElement &&
      !modal.contains(focused)
    )
      return;
    if (
      previous?.isConnected &&
      previous !== document.body &&
      previous !== document.documentElement
    )
      previous.focus();
    else button.focus();
  });
  queryInput.addEventListener("keydown", (event) => {
    if (options.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        active < 0
          ? event.key === "ArrowDown"
            ? 0
            : options.length - 1
          : (active + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      select(next);
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      options[active].click();
    }
  });

  queryInput.addEventListener("input", () => {
    const request = ++revision;
    clearTimeout(timer);
    const query = queryInput.value.trim();
    list.replaceChildren();
    options = [];
    select(-1);
    queryInput.setAttribute("aria-expanded", "false");
    announcement.textContent = query ? "Searching…" : "Enter a title, topic, or keyword.";
    if (!query) return;
    timer = window.setTimeout(() => {
      void runSearch(query, request);
    }, 140);
  });

  async function runSearch(query: string, request: number) {
    try {
      const engine = await getEngine();
      const search = engine ? await engine.search(query) : null;
      const data = await Promise.all(
        (search?.results ?? []).slice(0, 12).map((result) => result.data()),
      );
      if (request !== revision) return;
      for (const item of data) {
        const url = new URL(item.url, location.origin);
        if (url.origin !== location.origin || !url.pathname.startsWith(`${base}posts/`)) continue;
        const option = document.createElement("a");
        option.href = url.href;
        option.tabIndex = -1;
        option.id = `search-option-${options.length}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        const title = document.createElement("strong");
        title.textContent = item.meta.title ?? "Article";
        const description = document.createElement("span");
        description.textContent = item.meta.description ?? "";
        const metadata = document.createElement("small");
        metadata.textContent = [item.meta.category, tagsLabel(item.meta.tags)]
          .filter(Boolean)
          .join(" · ");
        option.append(title, description, metadata);
        options.push(option);
        list.append(option);
      }
      queryInput.setAttribute("aria-expanded", String(options.length > 0));
      announcement.textContent = options.length
        ? `${options.length} result${options.length === 1 ? "" : "s"}`
        : "No matching articles.";
    } catch {
      if (request === revision)
        announcement.textContent =
          "Search index unavailable. Browse Articles or use the production preview.";
    }
  }
}
