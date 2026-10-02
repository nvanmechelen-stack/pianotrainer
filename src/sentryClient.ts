// Only what the app uses from Sentry, so the lazily loaded chunk stays small (tree-shaken).
export { captureException, init } from '@sentry/react'
