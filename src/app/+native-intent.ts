// The share sheet opens the app at stubs://expo-sharing; send that to the import screen.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes('expo-sharing')) return '/handle-share';
  } catch {
    // Fall through to the normal route.
  }
  return path;
}
