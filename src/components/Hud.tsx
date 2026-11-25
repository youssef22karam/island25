import { useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  RefObject,
} from "react";
import {
  ArrowUp,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUp,
  CircleHelp,
  Compass,
  Droplets,
  Expand,
  EyeOff,
  Footprints,
  Layers3,
  Leaf,
  Map as MapIcon,
  Menu,
  Ship,
  SlidersHorizontal,
  Square,
  Video,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  X,
} from "lucide-react";
import type { EngineState, IslandEngine } from "../engine/island.js";

type Icon = typeof Compass;

const MODES: { id: string; label: string; icon: Icon }[] = [
  { id: "survey", label: "Look", icon: Compass },
  { id: "walk", label: "Walk", icon: Footprints },
  { id: "boat", label: "Boat", icon: Ship },
  { id: "dive", label: "Dive", icon: Droplets },
];

const PLACES: { id: string; label: string; icon: Icon }[] = [
  { id: "sea", label: "Sea", icon: Waves },
  { id: "river", label: "River", icon: Wind },
  { id: "lake", label: "Lake", icon: Layers3 },
  { id: "swamp", label: "Swamp", icon: Leaf },
];

export interface HudProps {
  engine: RefObject<IslandEngine | null>;
  state: EngineState;
  available: boolean;
  touch: boolean;
  location: string;
  panel: boolean;
  muted: boolean;
  underwaterWalk: boolean;
  runLock: boolean;
  cameraMode: string;
  boat: { throttle: number; speed: number };
  onMode: (mode: string) => void;
  onPlace: (place: string) => void;
  onTogglePanel: () => void;
  onToggleAudio: () => void;
  onToggleUnderwaterWalk: () => void;
  onToggleRunLock: () => void;
  onCycleCamera: () => void;
  onAtlas: () => void;
  onHelp: () => void;
  onCapture: () => void;
  onFullscreen: () => void;
  onHide: () => void;
}

/** A button that is "held": down while pressed, released on lift, cancel or unmount. */
function Hold({
  label,
  className = "",
  onHold,
  children,
}: {
  label: string;
  className?: string;
  onHold: (down: boolean) => void;
  children: ReactNode;
}) {
  const [down, setDown] = useState(false);
  const live = useRef(false);
  const callback = useRef(onHold);
  callback.current = onHold;

  const set = (value: boolean) => {
    if (live.current === value) return;
    live.current = value;
    setDown(value);
    callback.current(value);
  };

  // Never leave a key stuck down if the control disappears mid-press.
  useEffect(
    () => () => {
      if (live.current) callback.current(false);
    },
    [],
  );

  return (
    <button
      type="button"
      className={`hud-key ${className} ${down ? "is-down" : ""}`}
      aria-label={label}
      title={label}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") set(true);
      }}
      onKeyUp={() => set(false)}
      onBlur={() => set(false)}
    >
      {children}
    </button>
  );
}

/** Analog thumb stick. Reports x (right) and y (forward) in -1..1 with a small dead zone. */
function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const knob = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const callback = useRef(onMove);
  callback.current = onMove;

  useEffect(() => () => callback.current(0, 0), []);

  const place = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const reach = box.width / 2 - 26;
    const rawX = e.clientX - (box.left + box.width / 2);
    const rawY = e.clientY - (box.top + box.height / 2);
    const length = Math.hypot(rawX, rawY) || 1;
    const pull = Math.min(length, reach);
    const ux = rawX / length;
    const uy = rawY / length;
    if (knob.current) knob.current.style.transform = `translate(${ux * pull}px, ${uy * pull}px)`;
    const amount = pull / reach;
    const live = amount < 0.14 ? 0 : (amount - 0.14) / 0.86;
    callback.current(ux * live, -uy * live);
  };

  const release = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    if (knob.current) knob.current.style.transform = "";
    callback.current(0, 0);
  };

  return (
    <div
      className="hud-stick"
      role="application"
      aria-label="Move"
      onPointerDown={(e) => {
        if (pointer.current !== null) return;
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        place(e);
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) place(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div className="hud-stick-knob" ref={knob} />
    </div>
  );
}

export default function Hud(props: HudProps) {
  const { engine, state, available, touch, boat } = props;
  const [menu, setMenu] = useState(false);

  const mode = state.mode;
  const altitude = state.altitude ?? 1;
  const submerged = (mode === "walk" || mode === "dive") && altitude < -0.05;

  const hold = (code: string) => (down: boolean) => engine.current?.setKey(code, down);
  const move = (x: number, y: number) => engine.current?.setMove(x, y);
  const pick = (action: () => void) => () => {
    setMenu(false);
    action();
  };

  // Throttle runs from -3 (reverse) to 8 (full ahead); neutral sits 3/11 along the bar.
  const lever = boat.throttle;
  const leverStyle: CSSProperties =
    lever >= 0
      ? { left: `${(3 / 11) * 100}%`, width: `${(lever / 11) * 100}%` }
      : { left: `${((3 + lever) / 11) * 100}%`, width: `${(-lever / 11) * 100}%` };

  const tools: { label: string; icon: Icon; on?: boolean; run: () => void }[] = [
    {
      label: props.panel ? "Hide weather and conditions" : "Weather and conditions",
      icon: SlidersHorizontal,
      on: props.panel,
      run: props.onTogglePanel,
    },
    { label: "Island map", icon: MapIcon, run: props.onAtlas },
    {
      label: props.muted ? "Turn sound on" : "Turn sound off",
      icon: props.muted ? VolumeX : Volume2,
      run: props.onToggleAudio,
    },
    { label: "Take a photo", icon: Camera, run: props.onCapture },
    { label: "Fullscreen", icon: Expand, run: props.onFullscreen },
    { label: "Controls", icon: CircleHelp, run: props.onHelp },
    { label: "Hide interface (H)", icon: EyeOff, run: props.onHide },
  ];

  // Clicking a HUD button must not pull keyboard focus away from the world.
  const keepFocus = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) e.preventDefault();
  };

  return (
    <div className="hud" onMouseDown={keepFocus}>
      <div className="hud-top">
        <div className="hud-group hud-modes" role="group" aria-label="Explore by">
          {MODES.map(({ id, label, icon: ModeIcon }) => (
            <button
              key={id}
              type="button"
              className={`hud-btn ${mode === id ? "is-on" : ""}`}
              disabled={!available}
              aria-pressed={mode === id}
              title={label}
              onClick={() => props.onMode(id)}
            >
              <ModeIcon size={16} strokeWidth={1.7} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="hud-menu-wrap">
          <button
            type="button"
            className="hud-menu-toggle"
            aria-label={menu ? "Close menu" : "Places and tools"}
            aria-expanded={menu}
            onClick={() => setMenu((open) => !open)}
          >
            {menu ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className={`hud-menu ${menu ? "is-open" : ""}`}>
            <div className="hud-group hud-places" role="group" aria-label="Go to">
              {PLACES.map(({ id, label, icon: PlaceIcon }) => (
                <button
                  key={id}
                  type="button"
                  className={`hud-btn ${props.location === id ? "is-on" : ""}`}
                  disabled={!available}
                  aria-pressed={props.location === id}
                  onClick={pick(() => props.onPlace(id))}
                >
                  <PlaceIcon size={15} strokeWidth={1.7} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="hud-group hud-tools">
              {tools.map(({ label, icon: ToolIcon, on, run }) => (
                <button
                  key={label}
                  type="button"
                  className={`hud-btn is-icon ${on ? "is-on" : ""}`}
                  aria-label={label}
                  title={label}
                  onClick={pick(run)}
                >
                  <ToolIcon size={17} strokeWidth={1.7} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hud-bottom">
        <div className="hud-left">
          {mode === "boat" && (
            <div className="hud-pad">
              <Hold label="Steer left" onHold={hold("ArrowLeft")}>
                <ChevronLeft size={30} />
              </Hold>
              <Hold label="Steer right" onHold={hold("ArrowRight")}>
                <ChevronRight size={30} />
              </Hold>
            </div>
          )}
          {touch && (mode === "walk" || mode === "dive") && <Joystick onMove={move} />}
        </div>

        <div className="hud-center">
          {mode === "walk" && (
            <button
              type="button"
              className={`hud-chip ${props.underwaterWalk ? "is-on" : ""}`}
              aria-pressed={props.underwaterWalk}
              onClick={props.onToggleUnderwaterWalk}
            >
              <Waves size={15} />
              Walk under water <b>{props.underwaterWalk ? "On" : "Off"}</b>
            </button>
          )}
          {submerged && (
            <span className="hud-chip is-static" aria-label="Depth below the surface">
              <ChevronDown size={14} />
              {(-altitude).toFixed(1)} m
            </span>
          )}
          {mode === "boat" && (
            <div className="hud-chip hud-gauge">
              <strong>{(Math.abs(boat.speed) * 1.94).toFixed(1)}</strong>
              <small>kn</small>
              <span className="hud-throttle" role="img" aria-label={`Throttle ${Math.round((lever / 8) * 100)} percent`}>
                <i className={lever < 0 ? "is-reverse" : ""} style={leverStyle} />
                <em />
              </span>
              <button type="button" className="hud-mini" onClick={props.onCycleCamera} title="Change camera (C)">
                <Video size={14} />
                {props.cameraMode}
              </button>
            </div>
          )}
        </div>

        <div className="hud-right">
          {mode === "boat" && (
            <div className="hud-pad">
              <Hold label="Cut the throttle" className="is-small" onHold={hold("Space")}>
                <Square size={16} />
              </Hold>
              <div className="hud-pad-col">
                <Hold label="Speed up" onHold={hold("ArrowUp")}>
                  <ChevronUp size={30} />
                </Hold>
                <Hold label="Slow down, then reverse" onHold={hold("ArrowDown")}>
                  <ChevronDown size={30} />
                </Hold>
              </div>
            </div>
          )}
          {touch && mode === "walk" && (
            <div className="hud-pad">
              <button
                type="button"
                className={`hud-key is-small ${props.runLock ? "is-on" : ""}`}
                aria-label="Keep running"
                aria-pressed={props.runLock}
                title="Keep running"
                onClick={props.onToggleRunLock}
              >
                <ChevronsUp size={20} />
              </button>
              <Hold label="Jump, or swim up under water" onHold={hold("Space")}>
                <ArrowUp size={26} />
              </Hold>
            </div>
          )}
          {touch && mode === "dive" && (
            <div className="hud-pad-col">
              <Hold label="Swim up" onHold={hold("KeyE")}>
                <ChevronUp size={28} />
              </Hold>
              <Hold label="Swim down" onHold={hold("KeyQ")}>
                <ChevronDown size={28} />
              </Hold>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
