import type { ComponentType, ReactNode } from "react";

/**
 * Wraps `children` in the given plugin providers, outermost-first: the first
 * provider in the array becomes the outermost element in the tree. Each wrap is
 * keyed by the provider's displayName (falling back to its position), so keys
 * stay stable across renders. Returns `children` unchanged when there are no
 * providers.
 */
export const composePluginProviders = (
  providers: ComponentType<{ children: ReactNode }>[],
  children: ReactNode
): ReactNode => {
  let tree = children;

  // Walk the providers from last to first so the first one ends up outermost.
  for (const [index, PluginProvider] of [...providers.entries()].toReversed()) {
    tree = (
      <PluginProvider key={PluginProvider.displayName ?? index}>
        {tree}
      </PluginProvider>
    );
  }

  return tree;
};
