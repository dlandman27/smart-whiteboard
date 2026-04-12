import figma from "@figma/code-connect";
import { Text } from "./Text";

figma.connect(Text, "TODO_FIGMA_URL", {
  props: {
    content: figma.string("Content"),
    variant: figma.enum("Variant", {
      Display: "display",
      Heading: "heading",
      Title: "title",
      Body: "body",
      Label: "label",
      Caption: "caption",
    }),
    size: figma.enum("Size", {
      Small: "small",
      Medium: "medium",
      Large: "large",
    }),
    color: figma.enum("Color", {
      Default: "default",
      Muted: "muted",
      Accent: "accent",
      Danger: "danger",
      Inverse: "inverse",
    }),
    align: figma.enum("Align", {
      Left: "left",
      Center: "center",
      Right: "right",
    }),
    italic: figma.boolean("Italic"),
  },
  example: ({ content, variant, size, color, align, italic }) => (
    <Text variant={variant} size={size} color={color} align={align} italic={italic}>
      {content}
    </Text>
  ),
});
