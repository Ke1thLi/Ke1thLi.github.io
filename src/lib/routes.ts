export function sitePath(...segments: string[]): string {
  const path = segments.map(encodeURIComponent).join("/");
  return path ? `${import.meta.env.BASE_URL}${path}/` : import.meta.env.BASE_URL;
}

export function tagRouteKey(tag: string): string {
  const portableSegment = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const reserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/;
  if (portableSegment.test(tag) && !reserved.test(tag)) return tag;
  return `~${Buffer.from(tag, "utf8").toString("hex")}`;
}
