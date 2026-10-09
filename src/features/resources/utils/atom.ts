import { decodeXml } from "./values";

export interface AtomLink {
  href: string;
  rel?: string;
  type?: string;
  title?: string;
}

export interface AtomEntry {
  id?: string;
  title?: string;
  summary?: string;
  published?: string;
  authors: string[];
  links: AtomLink[];
  doi?: string;
}

export interface AtomFeed {
  total?: number;
  start?: number;
  entries: AtomEntry[];
}

export function parseAtomFeed(xml: string): AtomFeed {
  if (!xml.includes("<feed") && !xml.includes("<entry")) {
    throw new Error("NOT_ATOM");
  }
  const total = numberTag(xml, "opensearch:totalResults");
  const start = numberTag(xml, "opensearch:startIndex");
  const entries = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)].map((match) => parseEntry(match[1]));
  return { total, start, entries };
}

function parseEntry(block: string): AtomEntry {
  const authors = [...block.matchAll(/<author\b[^>]*>([\s\S]*?)<\/author>/g)]
    .map((match) => tagText(match[1], "name"))
    .filter((name): name is string => Boolean(name));
  const links = [...block.matchAll(/<link\b([^>]*?)\/?>/g)].map((match) => {
    const attrs = attributes(match[1]);
    return { href: attrs.href ?? "", rel: attrs.rel, type: attrs.type, title: attrs.title };
  }).filter((link) => link.href);
  return {
    id: tagText(block, "id"),
    title: tagText(block, "title"),
    summary: tagText(block, "summary"),
    published: tagText(block, "published") ?? tagText(block, "updated"),
    authors,
    links,
    doi: tagText(block, "arxiv:doi"),
  };
}

function tagText(block: string, tag: string): string | undefined {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)</${escaped}>`));
  if (!match) return undefined;
  const text = decodeXml(match[1]).replace(/\s+/g, " ").trim();
  return text || undefined;
}

function numberTag(block: string, tag: string): number | undefined {
  const text = tagText(block, tag);
  if (!text) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

function attributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([A-Za-z_:][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
  for (const match of source.matchAll(pattern)) {
    attrs[match[1]] = decodeXml(match[3] ?? match[4] ?? "");
  }
  return attrs;
}
