import figma from "@figma/code-connect";
import { Chip } from "./Chip";

figma.connect(Chip, "TODO_FIGMA_URL", {
  props: {
    label: figma.string("Label"),
    variant: figma.enum("Variant", {
      Default: "default",
      Selected: "selected",
    }),
    disabled: figma.boolean("Disabled"),
    hasIcon: figma.boolean("Icon Left"),
  },
  example: ({ label, variant, disabled }) => (
    <Chip variant={variant} disabled={disabled}>
      {label}
    </Chip>
  ),
});
