import { test } from 'node:test'
import assert from 'node:assert/strict'

test('development and production use separate build folders', async () => {
  const original = process.env.NODE_ENV
  try {
    process.env.NODE_ENV = 'development'
    const { default: dev } = await import('../next.config.mjs?development')
    process.env.NODE_ENV = 'production'
    const { default: production } = await import('../next.config.mjs?production')
    assert.equal(dev.distDir, '.next-dev')
    assert.equal(production.distDir, '.next')
    assert.notEqual(dev.distDir, production.distDir)
  } finally {
    if (original === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = original
  }
})

test('Turbopack and webpack development servers keep separate caches', async () => {
  const originalMode = process.env.NODE_ENV
  const originalTurbo = process.env.TURBOPACK
  try {
    process.env.NODE_ENV = 'development'
    process.env.TURBOPACK = '1'
    const { default: turbo } = await import('../next.config.mjs?turbopack')
    delete process.env.TURBOPACK
    const { default: webpack } = await import('../next.config.mjs?webpack')
    assert.equal(turbo.distDir, '.next-turbo')
    assert.equal(webpack.distDir, '.next-dev')
  } finally {
    if (originalMode === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalMode
    if (originalTurbo === undefined) delete process.env.TURBOPACK
    else process.env.TURBOPACK = originalTurbo
  }
})
