const base = import.meta.env.BASE_URL;
const prefix = base === "/" ? "moonlit-folio" : `moonlit-folio:${base}`;

export function preferenceKey(name: string): string {
  return `${prefix}-${name}`;
}
