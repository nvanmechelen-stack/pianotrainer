import { Link, NavLink } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import { CardsIcon, ExplorerIcon, FlowIcon, HomeIcon, SpeedIcon } from './Icons'

export interface Tab {
  path: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const TABS: Tab[] = [
  { path: '/', label: 'Home', icon: HomeIcon },
  { path: '/explorer', label: 'Explorer', icon: ExplorerIcon },
  { path: '/flashcards', label: 'Flashcards', icon: CardsIcon },
  { path: '/flow', label: 'ii-V-I Flow', icon: FlowIcon },
  { path: '/speed', label: 'Speed Trainer', icon: SpeedIcon },
]

/**
 * Portrait phones: tab bar at the bottom. Landscape and tablets: a slim side rail,
 * so the keyboard keeps all the vertical space.
 */
export function NavBar() {
  return (
    <nav
      className="order-last flex shrink-0 justify-around border-t border-line bg-panel/90 pb-[env(safe-area-inset-bottom)] backdrop-blur
        landscape:order-first landscape:w-20 landscape:flex-col landscape:justify-start landscape:gap-1 landscape:border-t-0 landscape:border-r landscape:py-3 landscape:pb-3 landscape:pl-[env(safe-area-inset-left)]
        md:order-first md:w-24 md:flex-col md:justify-start md:gap-1 md:border-t-0 md:border-r md:py-3 md:pb-3"
    >
      <Link
        to="/"
        className="hidden px-2 pb-3 text-center text-xs font-black tracking-wide text-muted landscape:block md:block short:hidden"
      >
        <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">PIANO</span>
        <br />
        TRAINER
      </Link>
      {TABS.map(({ path, label, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end
          className={({ isActive }) =>
            `mx-1 flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[11px] short:py-1.5 font-bold transition-colors
             landscape:flex-none md:flex-none ${
               isActive ? 'bg-accent/20 text-white' : 'text-muted hover:text-white'
             }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`h-6 w-6 ${isActive ? 'text-accent-2' : ''}`} />
              <span className="text-center leading-tight">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
