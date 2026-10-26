export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let rel = specifier.slice(2);
    if (!/\.(ts|tsx|js|mjs|json)$/.test(rel)) rel += ".ts";
    return nextResolve(new URL("../src/" + rel, import.meta.url).href, context);
  }
  return nextResolve(specifier, context);
}
