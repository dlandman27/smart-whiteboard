import figma from "@figma/code-connect";
import { Button } from "./Button";

figma.connect(Button, "TODO_FIGMA_URL", {
  props: {
    label: figma.string("Label"),
    variant: figma.enum("Variant", {
      Solid: "solid",
      Outline: "outline",
      Ghost: "ghost",
      Link: "link",
      Accent: "accent",
    }),
    size: figma.enum("Size", {
      Small: "sm",
      Medium: "md",
      Large: "lg",
    }),
    fullWidth: figma.boolean("Full Width"),
    disabled: figma.boolean("Disabled"),
    iconLeft: figma.boolean("Icon Left"),
    iconRight: figma.boolean("Icon Right"),
  },
  example: ({ label, variant, size, fullWidth, disabled }) => (
    <Button variant={variant} size={size} fullWidth={fullWidth} disabled={disabled}>
      {label}
    </Button>
  ),
});
