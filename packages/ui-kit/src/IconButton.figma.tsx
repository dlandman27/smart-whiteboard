import figma from "@figma/code-connect";
import { IconButton } from "./IconButton";

figma.connect(IconButton, "TODO_FIGMA_URL", {
  props: {
    icon: figma.string("Icon"),
    variant: figma.enum("Variant", {
      Default: "default",
      Active: "active",
      Ghost: "ghost",
    }),
    size: figma.enum("Size", {
      Small: "sm",
      Medium: "md",
      Large: "lg",
      "Extra Large": "xl",
    }),
    disabled: figma.boolean("Disabled"),
  },
  example: ({ icon, variant, size, disabled }) => (
    <IconButton icon={icon} variant={variant} size={size} disabled={disabled} />
  ),
});
