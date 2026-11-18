import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react";

import "../styles/globals.css";

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      defaultTheme: "light",
      themes: {
        dark: "dark",
        light: "light",
      },
    }),
    (Story) => (
      <div className="bg-background text-foreground min-h-screen p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
};

export default preview;
