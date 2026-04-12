import figma from "@figma/code-connect";
import { Slider } from "./Slider";

figma.connect(Slider, "TODO_FIGMA_URL", {
  props: {
    label: figma.string("Label"),
    unit: figma.string("Unit"),
  },
  example: ({ label, unit }) => (
    <Slider label={label} value={50} min={0} max={100} unit={unit} onChange={(v) => console.log(v)} />
  ),
});
