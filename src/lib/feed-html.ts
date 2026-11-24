import { parseFragment, serialize, type DefaultTreeAdapterTypes } from "parse5";

type Parent = DefaultTreeAdapterTypes.ParentNode;

const proseElements = new Set(
  (
    "a abbr address article aside b blockquote br caption code dd del details dfn div dl dt em " +
    "figcaption figure footer h1 h2 h3 h4 h5 h6 header hgroup hr i img kbd li main mark ol p pre q s samp small span strong sub summary " +
    "sup picture section source table tbody td th thead tfoot tr u ul var"
  ).split(" "),
);
const mathElements = new Set(
  (
    "math semantics annotation merror mfrac mi mmultiscripts mn mo mover mpadded mphantom " +
    "mprescripts mroot mrow mspace msqrt mstyle msub msubsup msup mtable mtd mtext mtr " +
    "munder munderover none"
  ).split(" "),
);
const proseAttributes = new Set([
  "alt",
  "colspan",
  "height",
  "lang",
  "rowspan",
  "scope",
  "start",
  "title",
  "width",
]);
const mathAttributes = new Set([
  "accent",
  "columnalign",
  "columnspacing",
  "depth",
  "display",
  "encoding",
  "fence",
  "height",
  "lspace",
  "mathvariant",
  "rowspacing",
  "rspace",
  "stretchy",
  "width",
  "xmlns",
]);

export function feedHtml(html: string, article: URL): string {
  const fragment = parseFragment(html);
  cleanContent(fragment, article);
  return serialize(fragment);
}

function imageCandidates(value: string, article: URL): string {
  const candidates = [];
  // URLs may contain commas. A trailing comma or the end of a descriptor separates candidates.
  const tokens = /[\s,]*([^\s,][^\s]*)(?:\s+([^,]*),?)?/gy;
  let offset = 0;
  while (offset < value.length) {
    tokens.lastIndex = offset;
    const match = tokens.exec(value);
    if (!match) break;
    const [, raw, suffix] = match;
    const separated = raw.endsWith(",");
    const descriptor = separated ? "" : (suffix?.trim() ?? "");
    offset = separated ? match.index + match[0].indexOf(raw) + raw.length : tokens.lastIndex;
    const url = URL.parse(separated ? raw.replace(/,+$/, "") : raw, article);
    if (
      url &&
      ["http:", "https:"].includes(url.protocol) &&
      /^(?:[1-9]\d*w|(?:\d+(?:\.\d+)?|\.\d+)x)?$/.test(descriptor)
    ) {
      candidates.push(descriptor ? `${url.href} ${descriptor}` : url.href);
    }
  }
  return candidates.join(", ");
}

function cleanContent(parent: Parent, article: URL) {
  parent.childNodes = parent.childNodes.flatMap((node) => {
    if (node.nodeName === "#text") return [node];
    if (!("tagName" in node)) return [];
    const isMath = node.namespaceURI === "http://www.w3.org/1998/Math/MathML";
    const isHtml = node.namespaceURI === "http://www.w3.org/1999/xhtml";
    if (!isMath && !isHtml) return [];
    const parentTag = "tagName" in parent ? parent.tagName : undefined;
    const grandparent = "parentNode" in parent ? parent.parentNode : null;
    const inListItem =
      parentTag === "li" ||
      (parentTag === "p" &&
        grandparent &&
        "tagName" in grandparent &&
        grandparent.tagName === "li");
    if (
      isHtml &&
      node.tagName === "input" &&
      inListItem &&
      node.attrs.some(({ name, value }) => name === "type" && value.toLowerCase() === "checkbox") &&
      node.attrs.some(({ name }) => name === "disabled")
    ) {
      const checked = node.attrs.some(({ name }) => name === "checked");
      return [{ nodeName: "#text" as const, value: checked ? "[x] " : "[ ] ", parentNode: parent }];
    }
    const allowedElements = isMath ? mathElements : proseElements;
    if (!allowedElements.has(node.tagName)) return [];
    if (node.tagName === "source" && parentTag !== "picture") return [];

    // Prefer native MathML in readers, which do not carry the site's KaTeX stylesheet.
    const classes = node.attrs.find(({ name }) => name === "class")?.value.split(/\s+/);
    if (classes?.includes("katex-html")) return [];

    const allowedAttributes = isMath ? mathAttributes : proseAttributes;
    node.attrs = node.attrs.filter((attribute) => {
      if (attribute.namespace) return false;
      const { name, value } = attribute;
      if (allowedAttributes.has(name)) return true;
      if (
        (node.tagName === "img" || node.tagName === "source") &&
        (name === "srcset" || name === "sizes")
      ) {
        if (name === "sizes") return true;
        attribute.value = imageCandidates(value, article);
        return attribute.value.length > 0;
      }
      if (node.tagName === "source" && (name === "media" || name === "type")) return true;
      if (!(node.tagName === "a" && name === "href") && !(node.tagName === "img" && name === "src"))
        return false;
      const url = URL.parse(value, article);
      if (!url) return false;
      const protocols =
        node.tagName === "a" ? ["http:", "https:", "mailto:", "tel:"] : ["http:", "https:"];
      if (!protocols.includes(url.protocol)) return false;
      attribute.value = url.href;
      return true;
    });
    if (node.tagName === "source" && !node.attrs.some(({ name }) => name === "srcset")) return [];
    cleanContent(node, article);
    if (node.tagName === "span" && node.attrs.length === 0) {
      for (const child of node.childNodes) child.parentNode = parent;
      return node.childNodes;
    }
    return [node];
  });
}
