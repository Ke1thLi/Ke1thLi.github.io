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
const hint = opener?.querySelector("kbd");
if (hint && /Mac|iPhone|iPad/.test(navigator.platform)) hint.textContent = "⌘ K";

const base = import.meta.env.BASE_URL;
const directory = `${base}pagefind/`;
const han = /\p{Script=Han}/u;
type SearchManifest = { articleCount: number; chineseIndex: boolean };
let manifest: Promise<SearchManifest> | undefined;
const engines = new Map<string, Promise<Pagefind>>();
let chineseSegmenter: Intl.Segmenter | undefined;

function indexQuery(query: string) {
  if (!han.test(query) || typeof Intl.Segmenter !== "function") return query;
  // Pagefind 1.6 still segments queries according to the page language after index selection.
  chineseSegmenter ??= new Intl.Segmenter("zh", { granularity: "word" });
  return Array.from(chineseSegmenter.segment(query), ({ segment }) => segment).join(" ");
}

function getManifest() {
  manifest ??= readManifest().catch((error: unknown) => {
    manifest = undefined;
    throw error;
  });
  return manifest;
}

async function readManifest(): Promise<SearchManifest> {
  const response = await fetch(`${directory}search-manifest.json`);
  if (!response.ok) throw new Error("Missing article search index");
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("articleCount" in data) ||
    typeof data.articleCount !== "number" ||
    !Number.isSafeInteger(data.articleCount) ||
    data.articleCount < 0 ||
    !("chineseIndex" in data) ||
    typeof data.chineseIndex !== "boolean"
  ) {
    throw new Error("Invalid article search index");
  }
  return { articleCount: data.articleCount, chineseIndex: data.chineseIndex };
}

async function loadModule(path: string): Promise<Pagefind> {
  const moduleUrl = `${path}pagefind.js`;
  const module: Pagefind = await import(/* @vite-ignore */ moduleUrl);
  await module.options({ baseUrl: base });
  return module;
}

async function getEngine(query: string) {
  const { articleCount, chineseIndex } = await getManifest();
  if (!articleCount) return null;
  const path = chineseIndex && han.test(query) ? `${directory}chinese/` : directory;
  let engine = engines.get(path);
  if (!engine) {
    engine = loadModule(path).catch((error: unknown) => {
      engines.delete(path);
      throw error;
    });
    engines.set(path, engine);
  }
  return engine;
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
      event.isComposing ||
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
    if (event.isComposing || options.length === 0) return;
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
      const engine = await getEngine(query);
      const search = engine ? await engine.search(indexQuery(query)) : null;
      const data = await Promise.all(
        (search?.results ?? []).slice(0, 12).map((result) => result.data()),
      );
      if (request !== revision) return;
      const seen = new Set<string>();
      for (const item of data) {
        const url = new URL(item.url, location.origin);
        if (url.origin !== location.origin || !url.pathname.startsWith(`${base}posts/`)) continue;
        if (seen.has(url.pathname)) continue;
        seen.add(url.pathname);
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

  if (document.querySelector("[data-search-page]")) {
    open();
    const params = new URLSearchParams(location.search);
    const query = params.get("q") ?? params.get("keyword");
    if (query) {
      queryInput.value = query;
      queryInput.dispatchEvent(new Event("input"));
    }
  }
}
