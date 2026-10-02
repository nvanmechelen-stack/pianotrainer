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

/** Feedback colours for keys (success and warning match the theme tokens; danger is the key fill, --color-danger the text). */
export const STATUS = {
  success: '#38d9a9',
  danger: '#ff6b6b',
  warning: '#ffc233',
  /** Keys being built on screen, before Check. */
  selected: '#9b84ff',
  /** A previous chord shown underneath (3:1 against white and black keys). */
  previous: '#857dc4',
}

export const ROLE_LABELS: Record<ColorKey, string> = {
  root: 'Root',
  third: '3rd',
  fifth: '5th',
  seventh: '7th',
  tension: 'Tension',
  bass: 'Bass (root)',
}
