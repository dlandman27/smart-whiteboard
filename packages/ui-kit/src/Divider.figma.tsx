import figma from "@figma/code-connect";
import { Divider } from "./Divider";

figma.connect(Divider, "TODO_FIGMA_URL", {
  props: {
    orientation: figma.enum("Orientation", {
      Horizontal: "horizontal",
      Vertical: "vertical",
    }),
  },
  example: ({ orientation }) => <Divider orientation={orientation} />,
});
