import { ArrowLeftIcon } from "@/components/icons/arrow";
import { CcOffIcon, CcOnIcon } from "@/components/icons/cc";
import { MaximizeIcon, MinimizeIcon } from "@/components/icons/fullscreen";
import { PauseIcon, PlayIcon } from "@/components/icons/play-pause";
import { VolumeOffIcon, VolumeOnIcon } from "@/components/icons/volume";
import { Slider } from "@/components/ui/slider";
import Settings from "@/app/player/[...params]/controls/index";
import {
  AudioTrackTypes,
  QualityLevel,
  VideoPlayerControls,
  VideoPlayerState,
} from "../useVideoPlayer";
import { MediaOption } from "@/hooks/open-subtitle";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { formatTime } from "@/lib/format-time";
import { motion } from "framer-motion";
import Episodes from "../episodes";
import { useRouter } from "next/navigation";
import { DubTypes, QualityTrack } from "@/hooks/source";
import Link from "next/link";
import { Cloud, Layers2, Lock, Server } from "lucide-react";
import { CloudIcon } from "@/components/icons/cloud";
import { ServerIcon } from "@/components/icons/server";
import { DownloadIcon } from "@/components/icons/download";
import { cn } from "@/lib/utils";
export interface VideoControlsProps {
  state: VideoPlayerState;
  controls: VideoPlayerControls;
  playerSrc: string | null;
  tmdbId: string;
  imdbId: string | null;
  season: number;
  episode: number;
  media_type: string;
  currentTime: number;
  skipBy: (skip: number) => void;
  year: string;
  genre: string;
  //
  quality: QualityLevel[];
  audioTracks: AudioTrackTypes[];
  //

  mergeSubtitles: MediaOption[];
  dubs: DubTypes[];
  //
  title: string;
  //
  onPip: () => void;
  //
  cCToggle: boolean;
  setCcToggle: Dispatch<SetStateAction<boolean>>;

  //
  resetTimer: () => void;
  lockTimer: () => void;
  //
  totalSeasons: number;

  source: QualityTrack[];
  //
  color: string;
  back: boolean;

  canNext: boolean;
  nextSeason: number;
  nextEpisode: number;

  showServer: boolean;
  setShowServer: Dispatch<SetStateAction<boolean>>;
}
export default function MainControls({
  state,
  controls,
  playerSrc,
  tmdbId,
  imdbId,
  season,
  episode,
  media_type,
  currentTime,
  skipBy,
  year,
  genre,
  //
  quality,
  audioTracks,
  //

  mergeSubtitles,
  dubs,
  //

  title,
  //
  onPip,
  //
  cCToggle,
  setCcToggle,
  //
  resetTimer,
  lockTimer,
  //
  totalSeasons,
  //
  source,
  color,
  back,

  ///
  canNext,
  nextEpisode,
  nextSeason,
  showServer,
  setShowServer,
}: VideoControlsProps) {
  const router = useRouter();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const handleSliderHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current || !state.duration) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const percent = Math.min(Math.max(x / rect.width, 0), 1);
    const time = percent * state.duration;

    setHoverX(x);
    setHoverTime(time);
  };
  const clearHover = () => {
    setHoverTime(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "z-10 absolute inset-0",
        "flex flex-col justify-between",
        "pointer-events-none",
        "bg-linear-to-t from-black/80 via-transparent to-black/50",
      )}
      onPointerMove={lockTimer}
    >
      <div
        className={cn(
          "lg:p-4 p-3  landscape:p-2",
          "flex justify-between items-center",
          "pointer-events-auto",
        )}
      >
        {back ? (
          <button onClick={() => router.back()} className="cursor-pointer">
            <ArrowLeftIcon
              className={cn(
                "lg:size-13 md:size-10 size-10 landscape:size-7",
                "text-muted-foreground",
              )}
            />
          </button>
        ) : (
          <div className="hidden md:block"></div>
        )}
        {/* UPPER */}
        <div
          className={cn("md:hidden landscape:block", back ? "text-center" : "")}
        >
          <p
            className={cn(
              "sm:text-xs text-xs landscape:text-[0.6rem]",
              "text-gray-400",
            )}
          >
            Your'e Watching
          </p>
          <h1 className="text-sm sm:text-base landscape:text-sm font-semibold">
            {title} {media_type === "tv" ? `S${season}E${episode}` : ""}
          </h1>
        </div>
        <button
          onClick={() => setShowServer((prev) => !prev)}
          className="cursor-pointer"
        >
          <Layers2
            strokeWidth={3}
            className={cn(
              "lg:size-8 md:size-7 size-6.5 landscape:size-5",
              showServer ? "text-foreground" : "text-muted-foreground",
            )}
          />
        </button>
      </div>
      <div
        className={cn(
          "w-full",
          "lg:p-4 p-3 landscape:p-2",
          "lg:py-6 py-3",
          "space-y-3",
        )}
      >
        <div
          className={cn(
            "lg:p-4 p-2",
            "pointer-events-none",
            "hidden md:block landscape:hidden",
          )}
        >
          <span className={cn("flex lg:gap-3 gap-1.5 items-center")}>
            <div
              className={cn("lg:w-1 w-0.5 lg:h-5 h-3 rounded-full")}
              style={{ backgroundColor: `#${color}` }}
            ></div>
            <p className={cn("lg:text-lg md:text-sm text-gray-400")}>
              Your'e Watching
            </p>
          </span>
          <h1
            className={cn(
              "md:text-2xl lg:text-4xl",
              "lg:mt-2 md:mt-1.5",
              "font-bold tracking-wide",
            )}
          >
            {title}
          </h1>
          <div
            className={cn(
              "lg:text-lg md:text-sm",
              "text-gray-400 font-medium",
              "md:mt-3",
              "flex gap-3",
            )}
          >
            <p>{year}</p> |<p>{genre}</p>|
            <p>{media_type === "tv" ? "TV Show" : "Movie"}</p>
          </div>
        </div>
        <div
          className={cn(
            "space-y-3 landscape:space-y-0.5",
            "pointer-events-auto",
          )}
        >
          <div
            className={cn(
              "space-y-2 landscape:space-y-0.5",
              "md:px-2 lg:px-3 landscape:px-2",
            )}
          >
            <div
              className={cn(
                "group",
                "lg:h-4 h-2",
                "flex justify-center items-center",
              )}
            >
              <div
                className="relative w-full"
                ref={sliderRef}
                onMouseMove={handleSliderHover}
                onMouseLeave={clearHover}
              >
                {/* Buffered bar */}
                <div className="absolute inset-0 rounded pointer-events-none">
                  <div
                    className="h-full bg-muted-foreground/50 rounded"
                    style={{
                      width: state.duration
                        ? `${(state.buffered / state.duration) * 100}%`
                        : "0%",
                    }}
                  />
                </div>

                {hoverTime !== null && (
                  <div
                    className={cn(
                      "absolute -top-8",
                      "px-2 py-1",
                      "text-sm rounded",
                      "bg-background/70 backdrop-blur-2xl",
                      "text-foreground",
                      "pointer-events-none z-40",
                    )}
                    style={{
                      left: hoverX,
                      transform: "translateX(-50%)",
                    }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}
                <Slider
                  value={[state.currentTime]}
                  max={state.duration || 1}
                  step={0.1}
                  onValueChange={(value) => controls.handleSeekChange(value)}
                  onValueCommit={(value) => controls.handleSeekCommit(value)}
                  className="relative z-10"
                  color={color}
                />
              </div>
            </div>
            <div
              className={cn(
                "md:hidden",
                "flex justify-between",
                "text-sm landscape:text-xs",
              )}
            >
              <span>{formatTime(state.currentTime)}</span>
              <span>{formatTime(state.duration)}</span>
            </div>
          </div>
          <div
            className={cn(
              "flex md:justify-between justify-center items-center",
              "w-full",
              "lg:gap-3 gap-6",
            )}
          >
            <div className={cn("flex items-center md:gap-3 gap-6")}>
              <button
                onClick={controls.togglePlay}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                {state.playing ? (
                  <motion.div
                    key="pause"
                    initial={{ opacity: 0, scale: 1.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.3 }}
                    transition={{ duration: 0.1 }}
                  >
                    <PauseIcon
                      className={cn(
                        "lg:size-13 md:size-10 size-9 landscape:size-7",
                      )}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="play"
                    initial={{ opacity: 0, scale: 1.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.3 }}
                    transition={{ duration: 0.1 }}
                  >
                    <PlayIcon
                      className={cn(
                        "lg:size-13 md:size-10 size-9 landscape:size-7",
                      )}
                    />
                  </motion.div>
                )}
              </button>

              <div className="flex items-center gap-2 group">
                <button
                  onClick={controls.toggleMute}
                  className="text-white/80 hover:text-white cursor-pointer"
                >
                  {state.muted || state.volume === 0 ? (
                    <motion.div
                      key="muted"
                      initial={{ opacity: 0, scale: 1.3 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.3 }}
                      transition={{ duration: 0.1 }}
                    >
                      <VolumeOffIcon
                        className={cn(
                          "lg:size-13 md:size-10 size-9 landscape:size-7",
                        )}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="unmuted"
                      initial={{ opacity: 0, scale: 1.3 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.3 }}
                      transition={{ duration: 0.1 }}
                    >
                      <VolumeOnIcon
                        className={cn(
                          "lg:size-13 md:size-10 size-9 landscape:size-7",
                        )}
                      />
                    </motion.div>
                  )}
                </button>
                <Slider
                  value={[state.muted ? 0 : state.volume]}
                  min={0}
                  max={1}
                  step={0.02}
                  onValueChange={([v]) => controls.setVolume(v)}
                  className={cn(
                    "w-0 group-hover:w-24",
                    "transition-[width] duration-200 ease-in-out",
                    "hidden md:flex",
                  )}
                  color={color}
                />
              </div>
              <div
                className={cn(
                  "md:flex hidden",
                  "lg:gap-2 gap-1 items-center",
                  "lg:ml-2",
                  "lg:text-base text-sm",
                )}
              >
                <span>{formatTime(state.currentTime)}</span>/
                <span>{formatTime(state.duration)}</span>
              </div>

              {media_type === "tv" && canNext && (
                <Link
                  className={cn(
                    "cursor-pointer text-muted-foreground",
                    "hidden lg:block",
                  )}
                  href={`/player/tv/${tmdbId}/${nextSeason}/${nextEpisode}`}
                >
                  Next Episode S{nextSeason}-E{nextEpisode}
                </Link>
              )}
            </div>

            <div className={cn("flex items-center md:gap-3 gap-6")}>
              <Settings
                mergeSubtitles={mergeSubtitles}
                quality={quality}
                audioTracks={audioTracks}
                onPip={onPip}
                imdbId={imdbId}
                season={season}
                episode={episode}
                media_type={media_type}
                resetTimer={resetTimer}
                lockTimer={lockTimer}
                source={source}
                dubs={dubs}
              />
              {media_type === "tv" && (
                <Episodes
                  tmdbId={tmdbId}
                  season={season}
                  episode={episode}
                  lockTimer={lockTimer}
                  resetTimer={resetTimer}
                  totalSeasons={totalSeasons}
                />
              )}
              {/* <button
                onClick={controls.toggleFullscreen}
                className="cursor-pointer text-white/80 hover:text-white"
              >
                <Lock
                  strokeWidth={3}
                  className={cn(
                    "lg:size-9 md:size-7 size-6 landscape:size-4.5",
                  )}
                />
              </button> */}
              <button
                onClick={controls.toggleFullscreen}
                className="cursor-pointer text-white/80 hover:text-white"
              >
                {state.fullscreen ? (
                  <motion.div
                    key="minimize"
                    initial={{ opacity: 0, scale: 1.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.3 }}
                    transition={{ duration: 0.1 }}
                  >
                    <MinimizeIcon
                      className={cn(
                        "lg:size-13 md:size-10 size-9 landscape:size-7",
                      )}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="maximize"
                    initial={{ opacity: 0, scale: 1.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.3 }}
                    transition={{ duration: 0.1 }}
                  >
                    <MaximizeIcon
                      className={cn(
                        "lg:size-13 md:size-10 size-9 landscape:size-7",
                      )}
                    />
                  </motion.div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
