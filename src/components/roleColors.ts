import type { Role } from '../theory/notes'

export type ColorKey = Role | 'bass'

export const ROLE_COLORS: Record<ColorKey, string> = {
  root: '#ff6b6b',
  third: '#4dabf7',
  fifth: '#b197fc',
  seventh: '#ffc233',
  tension: '#38d9a9',
  bass: '#f06bd8',
}

export const ROLE_LABELS: Record<ColorKey, string> = {
  root: 'Root',
  third: '3rd',
  fifth: '5th',
  seventh: '7th',
  tension: 'Tension',
  bass: 'Bass (root)',
}
