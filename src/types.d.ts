// Globals shared between the TypeScript shell and the scene modules in src/scene (plain ES modules that publish on `window`).

type LightMode = 'day' | 'evening';

interface FamScreen {
  id: string;
  n: string;
  title: string;
  sub: string;
  desc: string;
  cams: string[];
  rooms: string[];
}

interface FamApp {
  /** Builds the scene inside the given root element and shows the title screen. */
  init(root: HTMLElement): void;
  start(): void;
  goScreen(index: number): void;
  goPreset(index: number): void;
  next(): void;
  prev(): void;
  nextView(): void;
  setMode(mode: LightMode): void;
  toggleLabels(on?: boolean): void;
  togglePlan(on?: boolean): void;
  toggleViews(on?: boolean): void;
  toggleFull(): void;
  enterExplore(): void;
  leaveExplore(): void;
  readonly SCREENS: FamScreen[];
  readonly PRESETS: { name: string; screen: number; cam: string }[];
}

interface Window {
  THREE: any;
  APT: any;
  APTPLAN: any;
  APTRENDER: any;
  APTFAM: FamApp;
}
