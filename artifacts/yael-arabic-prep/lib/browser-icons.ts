/** Expo can inject its own favicon after the static template. Keep one current
 * declaration per icon so Safari does not choose the old injected icon. */
export function setBrowserIcons(doc: Document) {
  const icons = [
    ['link[rel="icon"], link[rel="shortcut icon"]', 'icon', '/yaelians-icon-192.png?v=yaelians-logo-1'],
    ['link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]', 'apple-touch-icon', '/yaelians-apple-touch.png?v=yaelians-logo-1'],
  ] as const;
  for (const [selector, rel, href] of icons) {
    const existing = Array.from(doc.querySelectorAll<HTMLLinkElement>(selector));
    const link = existing.shift() ?? doc.createElement('link');
    link.rel = rel;
    link.type = 'image/png';
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    if (rel === 'apple-touch-icon') link.setAttribute('sizes', '180x180');
    if (!link.parentNode) doc.head.appendChild(link);
    for (const duplicate of existing) duplicate.remove();
  }
}
