import { describe, expect, it } from 'vitest'
import { NOT_FOUND, PAGES } from './seo'

describe('page meta', () => {
  const all = [...Object.values(PAGES), NOT_FOUND]

  it('has unique titles "Page — Piano Trainer" under 60 characters', () => {
    for (const { title } of all) {
      expect(title).toMatch(/ — Piano Trainer$/)
      expect(title.length, title).toBeLessThan(60)
    }
    expect(new Set(all.map((p) => p.title)).size).toBe(all.length)
  })

  it('has unique descriptions of 150–160 characters', () => {
    for (const { description } of all) {
      expect(description.length, description).toBeGreaterThanOrEqual(150)
      expect(description.length, description).toBeLessThanOrEqual(160)
    }
    expect(new Set(all.map((p) => p.description)).size).toBe(all.length)
  })
})

describe('sitemap', () => {
  it('lists every page and is referenced from robots.txt', async () => {
    const { readFileSync } = await import('node:fs')
    const sitemap = readFileSync('public/sitemap.xml', 'utf8')
    for (const path of Object.keys(PAGES)) expect(sitemap).toContain(`<loc>https://pianotrainer-8e3da.web.app${path}</loc>`)
    expect(readFileSync('public/robots.txt', 'utf8')).toContain('Sitemap: https://pianotrainer-8e3da.web.app/sitemap.xml')
  })
})
