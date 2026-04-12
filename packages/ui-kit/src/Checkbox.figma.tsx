import figma from "@figma/code-connect";
import { Checkbox } from "./Checkbox";

figma.connect(Checkbox, "TODO_FIGMA_URL", {
  props: {
    label: figma.string("Label"),
    checked: figma.boolean("Checked"),
  },
  example: ({ label, checked }) => (
    <Checkbox label={label} checked={checked} onChange={(v) => console.log(v)} />
  ),
});
