import figma from "@figma/code-connect";
import { Toggle } from "./Toggle";

figma.connect(Toggle, "TODO_FIGMA_URL", {
  props: {
    label: figma.string("Label"),
    value: figma.boolean("On"),
  },
  example: ({ label, value }) => (
    <Toggle label={label} value={value} onChange={(v) => console.log(v)} />
  ),
});
