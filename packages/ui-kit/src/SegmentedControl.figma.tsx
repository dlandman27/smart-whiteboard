import figma from "@figma/code-connect";
import { SegmentedControl } from "./SegmentedControl";

figma.connect(SegmentedControl, "TODO_FIGMA_URL", {
  props: {},
  example: () => (
    <SegmentedControl
      value="option1"
      options={[
        { value: "option1", label: "Option 1" },
        { value: "option2", label: "Option 2" },
        { value: "option3", label: "Option 3" },
      ]}
      onChange={(v) => console.log(v)}
    />
  ),
});
