import type React from "react";

type StubProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
};

const Passthrough = ({ children, className, ...rest }: StubProps) => (
  <div className={className} {...rest}>
    {children}
  </div>
);

// Stand-in for @base-ui/react/scroll-area used in tests (see the alias in
// vitest.config.mts). Base UI's ScrollArea measures the viewport and updates
// scrollbar state asynchronously after mount, which trips React's act()
// warning in nearly every component test. Calendar tests don't assert
// scrollbar behavior, so the parts render as lightweight elements.
export const ScrollArea = {
  Corner: () => null,
  Root: Passthrough,
  Scrollbar: () => null,
  Thumb: () => null,
  Viewport: Passthrough,
};
