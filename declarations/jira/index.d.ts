export type Content = Array<{
  type: string;
  content: Array<{ text: string; type: string; marks?: Array<{ type: string; attrs: { href: string } }> }>;
}>;
