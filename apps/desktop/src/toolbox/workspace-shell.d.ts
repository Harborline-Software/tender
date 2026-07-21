/**
 * Local type shim for `@shipyard/workspace-shell` (dual-surface toolbox,
 * shipyard #2973).
 *
 * The package publishes RAW TypeScript source whose exports import from the
 * shipyard monorepo's `_shared/` tree via `../../../_shared/…`. Consumed from an
 * external repo through a `file:` symlink, `tsc` (with `preserveSymlinks`) cannot
 * resolve those cross-tree paths and reports errors inside the package's own
 * source. A `paths` mapping in tsconfig.app.json points `tsc` at THIS shim (a
 * declaration only — nothing to resolve), while Vite still bundles the real
 * package source (Vite does not read tsconfig `paths`). The shim mirrors the
 * subset of the WorkspaceShell contract this app consumes; if the package's
 * public surface changes, update this file.
 */
declare module '@shipyard/workspace-shell' {
  import type { ButtonHTMLAttributes, ReactNode } from 'react'

  export type NavigationMode = 'hidden' | 'rail' | 'docked' | 'overlay'
  export type InspectorMode = 'hidden' | 'docked' | 'overlay' | 'maximized'
  export type UtilityMode = 'hidden' | 'collapsed' | 'docked' | 'overlay' | 'maximized'

  export type WorkspaceShellPanel = 'navigation' | 'inspector' | 'utility'

  export interface WorkspaceShellPanelSizes {
    navigation?: number
    inspector?: number
    utility?: number
  }

  export interface WorkspaceShellLabels {
    context: string
    panels: string
    navigation: string
    inspector: string
    utility: string
    resizeNavigation: string
    resizeInspector: string
    resizeUtility: string
    shortcuts: string
  }

  export interface WorkspaceShellProps {
    id: string
    children: ReactNode
    navigation: ReactNode
    inspector: ReactNode
    utility: ReactNode
    ecosystemBarHtml?: string
    ecosystemBar?: ReactNode
    ecosystemSearch?: ReactNode
    contextTitle: string
    contextHref?: string
    headerTitle?: ReactNode
    headerBadge?: ReactNode
    switcher: ReactNode
    headerLeading?: ReactNode
    headerTrailing?: ReactNode
    labels?: Partial<WorkspaceShellLabels>
    navigationMode?: NavigationMode
    inspectorMode?: InspectorMode
    utilityMode?: UtilityMode
    panelSizes?: WorkspaceShellPanelSizes
    navigationId?: string
    mainId?: string
    inspectorId?: string
    utilityId?: string
    mainLabel?: string
    navigationLabel?: string
    inspectorLabel?: string
    utilityLabel?: string
    className?: string
    headerClassName?: string
    headerInnerClassName?: string
    headerTitleClassName?: string
    shellClassName?: string
    navigationClassName?: string
    mainClassName?: string
    inspectorClassName?: string
    utilityClassName?: string
    showShortcuts?: boolean
    onStateChange?: (state: unknown) => void
  }

  export function WorkspaceShell(props: WorkspaceShellProps): JSX.Element

  export interface WorkspaceShellPanelToggleProps
    extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    shellId: string
    panel: WorkspaceShellPanel
    controls: string
    label: string
  }

  export function WorkspaceShellPanelToggle(props: WorkspaceShellPanelToggleProps): JSX.Element
}
