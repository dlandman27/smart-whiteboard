import figma from "@figma/code-connect";
import { Input } from "./Input";

figma.connect(Input, "TODO_FIGMA_URL", {
  props: {
    label: figma.string("Label"),
    placeholder: figma.string("Placeholder"),
    hint: figma.string("Hint"),
    error: figma.string("Error"),
    size: figma.enum("Size", {
      Small: "sm",
      Medium: "md",
      Large: "lg",
    }),
    hasIconLeft: figma.boolean("Icon Left"),
    hasIconRight: figma.boolean("Icon Right"),
  },
  example: ({ label, placeholder, hint, error, size }) => (
    <Input label={label} placeholder={placeholder} hint={hint} error={error} size={size} />
  ),
});
