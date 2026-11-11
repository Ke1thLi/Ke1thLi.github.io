import mermaid from "mermaid";

const system = matchMedia("(prefers-color-scheme: dark)");
const root = document.documentElement;
const blocks = new Map<HTMLPreElement, HTMLDivElement>();
let queue = Promise.resolve();
let id = 0;
let renderedTheme: "light" | "dark" | undefined;

function render(source: HTMLPreElement, output: HTMLDivElement) {
  queue = queue.then(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const dark =
      root.dataset.theme === "dark" || (root.dataset.theme !== "light" && system.matches);
    const theme = dark ? "dark" : "light";
    if (theme !== renderedTheme) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: dark ? "dark" : "default",
        flowchart: { htmlLabels: false },
      });
      renderedTheme = theme;
    }
    if (output.dataset.theme === theme) return;
    try {
      const result = await mermaid.render(`article-diagram-${++id}`, source.textContent ?? "");
      output.innerHTML = result.svg;
      output.dataset.theme = theme;
      output.hidden = false;
      source.hidden = true;
    } catch {
      delete output.dataset.theme;
      output.hidden = true;
      source.hidden = false;
    }
  });
}

export function mountDiagram(source: HTMLPreElement) {
  if (blocks.has(source)) return;
  const output = document.createElement("div");
  output.className = "mermaid-output";
  output.hidden = true;
  source.before(output);
  blocks.set(source, output);
  render(source, output);
}

function refresh() {
  for (const [source, output] of blocks) render(source, output);
}

new MutationObserver(refresh).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
system.addEventListener("change", refresh);
