// Type augmentations for specifyjs submodule imports
declare module '@asymmetric-effort/specifyjs/dom' {
  export function createRoot(container: Element | DocumentFragment, options?: any): {
    render(children: any): void;
    unmount(): void;
  };
  export function render(element: any, container: Element, callback?: () => void): void;
}

declare module '@asymmetric-effort/specifyjs/components' {
  export const Sidebar: any;
  export const Footer: any;
  export const Card: any;
  export const FlexContainer: any;
  export const FlexItem: any;
  export const Grid: any;
  export const GridItem: any;
  export const Panel: any;
  export const Tabs: any;
  export const DataGrid: any;
  export const BarGraph: any;
  export const LineGraph: any;
  export const PieGraph: any;
  export const CartesianGraph2D: any;
  export const VizWrapper: any;
  export const Badge: any;
  export const Tag: any;
  export const Alert: any;
  export const Checkbox: any;
  export const Toggle: any;
  export const Tooltip: any;
  export const Spinner: any;
  export const Skeleton: any;
  export const ProgressBar: any;
  export const Accordion: any;
  export const Breadcrumb: any;
  export const TreeNav: any;
  export const ListView: any;
  export const ScrollContainer: any;
  export const Splitter: any;
  export const Drawer: any;
  export const Modal: any;
  export const Popover: any;
  export const NavWrapper: any;
  export const Pagination: any;
  export const EmptyState: any;
  export const Image: any;
  export const Carousel: any;
  export const VideoPlayer: any;
  export const TextField: any;
  export const Select: any;
  export const RadioGroup: any;
  export const Stepper: any;
  export const Toolbar: any;
  export const PolarGraph2D: any;
  export const HypercubeGraph: any;
  export const useBarGraphScales: any;
  export const useLineGraphScales: any;
  export const buildNavItemStyle: any;
  export const useHover: any;
}

declare module '@asymmetric-effort/specifyjs/build' {
  import type { Plugin } from 'vite';
  export function specifyJsSeoPlugin(config: any): Plugin;
  export function specifyJsNoscriptPlugin(config: any): Plugin;
}
