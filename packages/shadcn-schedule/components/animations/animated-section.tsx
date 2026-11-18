import type { FC, HTMLAttributes, ReactNode, Ref } from "react";

import { cn } from "@/lib/cn";

interface AnimatedSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  "data-testid"?: string;
  delay?: number;
  direction?: "vertical" | "horizontal";
  ref?: Ref<HTMLDivElement>;
  transitionKey: string;
}

// CSS-only enter animation defined by this package's theme
// (`--animate-enter-x` / `--animate-enter-y` in styles/globals.css), replacing
// motion/react, which cost consumers ~123kB min (~28% of the bundle) for a
// 200ms fade. Changing `transitionKey` remounts the div, which replays the
// animation; the shorthand's `backwards` fill keeps the element hidden until
// its stagger `delay` (seconds) elapses.
export const AnimatedSection: FC<AnimatedSectionProps> = ({
  children,
  transitionKey,
  delay = 0,
  className,
  direction = "vertical",
  "data-testid": testId,
  ref,
  style,
  ...props
}) => {
  // Both utilities come from @repo/react-schedule/styles/globals.css, which the
  // app entry imports; class linting only resolves the entry file itself.
  /* oxlint-disable shadcn/no-unknown-classes -- animate-enter-x/y live in the package CSS */
  const slideInClass =
    direction === "horizontal" ? "animate-enter-x" : "animate-enter-y";
  /* oxlint-enable shadcn/no-unknown-classes */

  return (
    <div
      className={cn("inline-block w-full", slideInClass, className)}
      data-testid={testId}
      key={transitionKey}
      ref={ref}
      style={{ animationDelay: `${delay}s`, ...style }}
      {...props}
    >
      {children}
    </div>
  );
};

AnimatedSection.displayName = "AnimatedSection";
