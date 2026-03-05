export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  if (initial) {
    if (path.startsWith("/store/") || path.startsWith("/product/")) {
      console.log("Deep link detected, allowing path:", path);
      return path;
    }
    return "/";
  }
  return path;
}
