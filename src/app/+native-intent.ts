// The share sheet opens the app at stubs://expo-sharing; send that to the import screen.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes('expo-sharing')) return '/handle-share';
    // Add to Stash links: stubs://import?d=… (and the web page's link, if iOS hands it over)
    const d = path.match(/[?&]d=([A-Za-z0-9_-]+)/)?.[1] ?? path.match(/\/add\/?#([A-Za-z0-9_-]+)/)?.[1];
    if (d && /import|add/.test(path)) return `/import?d=${d}`;
  } catch {
    // Fall through to the normal route.
  }
  return path;
}
