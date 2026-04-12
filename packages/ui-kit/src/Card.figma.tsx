import figma from "@figma/code-connect";
import { Card } from "./Card";

figma.connect(Card, "TODO_FIGMA_URL", {
  props: {
    tone: figma.enum("Tone", {
      Default: "default",
      Accent: "accent",
      Flat: "flat",
    }),
    radius: figma.enum("Radius", {
      Small: "sm",
      Medium: "md",
      Large: "lg",
      "Extra Large": "xl",
    }),
    padding: figma.enum("Padding", {
      None: "none",
      Small: "sm",
      Medium: "md",
      Large: "lg",
    }),
    children: figma.children("Content"),
  },
  example: ({ tone, radius, padding, children }) => (
    <Card tone={tone} radius={radius} padding={padding}>
      {children}
    </Card>
  ),
});
