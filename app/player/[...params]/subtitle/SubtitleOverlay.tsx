// SubtitleOverlay.tsx
import { cn } from "@/lib/utils";
import { useSubtitleCue } from "./useSubtitleCue ";
import { useSettingsStore } from "@/zustand/settings-store";

const fontSizeMap: Record<string, string> = {
  small: "lg:text-2xl md:text-base text-xs",
  medium: "lg:text-4xl md:text-lg text-sm",
  large: "lg:text-5xl md:text-xl text-base",
  "x-large": "lg:text-6xl text-2xl",
};

const bgOpacityMap: Record<string, string> = {
  off: "bg-transparent",
  low: "bg-black/30",
  medium: "bg-black/60",
  high: "bg-black/90",
};

const fontColorMap: Record<string, string> = {
  white: "#FFFFFF",
  yellow: "#FDE047",
  green: "#4ADE80",
  cyan: "#22D3EE",
  red: "#F87171",
  blue: "#60A5FA",
  pink: "#F472B6",
  orange: "#FB923C",
};

export default function SubtitleOverlay({
  subtitleUrl,
  currentTime,
  position = "bottom",
  isVisible,
  domain,
}: {
  subtitleUrl: string | null;
  currentTime: number;
  position?: "top" | "bottom";
  isVisible: boolean;
  domain: string;
}) {
  const fontSize = useSettingsStore(
    (state) => state.values["Font size"]?.id ?? "medium",
  );
  const syncOffset = useSettingsStore(
    (state) => state.values["Sync offset"]?.id ?? "0.0s",
  );
  const fontColor = useSettingsStore(
    (state) => state.values["Font color"]?.id ?? "white",
  );
  const bgOpacity = useSettingsStore(
    (state) => state.values["Background opacity"]?.id ?? "off",
  );

  const offset = parseFloat(syncOffset);
  const adjustedTime = currentTime + offset;
  const cue = useSubtitleCue(subtitleUrl, adjustedTime, domain);

  if (!cue) return null;

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 z-10",
        "text-center",
        "px-3 landscape:px-1.5 py-1",
        "rounded",
        "lg:max-w-[80%] max-w-[98%]",
        "pointer-events-none",
        "landscape:text-[0.6rem]",
        "transition duration-300 delay-100",
        fontSizeMap[fontSize] ?? fontSizeMap["medium"],
        bgOpacityMap[bgOpacity] ?? bgOpacityMap["medium"],
        position === "bottom" ? "bottom-0" : "top-0",
        position === "bottom"
          ? isVisible
            ? "-translate-y-25 md:-translate-y-20 lg:-translate-y-30 landscape:-translate-y-18"
            : "-translate-y-10 md:-translate-y-10 lg:-translate-y-15 landscape:-translate-y-5"
          : isVisible
            ? "translate-y-15 lg:translate-y-25"
            : "translate-y-5 lg:translate-y-10",
      )}
      style={{
        color: fontColorMap[fontColor] ?? fontColorMap["white"],
        textShadow:
          "0px 0px 1px rgba(0,0,0,1), 0px 0px 2px rgba(0,0,0,1), 0px 0px 2px rgba(0,0,0,1), 0px 0px 2px rgba(0,0,0,1), 0px 0px 2px rgba(0,0,0,1)",
      }}
      dangerouslySetInnerHTML={{ __html: cue }}
    />
  );
}
