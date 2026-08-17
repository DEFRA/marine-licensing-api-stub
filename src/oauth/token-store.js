import { randomUUID } from 'node:crypto'
import { config } from '#/config.js'

// Bounded so unauthenticated callers cannot grow the map without limit.
const MAX_TOKENS = 100

const MILLISECONDS_PER_SECOND = 1000

const tokens = new Map()

const evictOldestIfFull = () => {
  if (tokens.size < MAX_TOKENS) {
    return
  }

  const oldest = tokens.keys().next().value
  tokens.delete(oldest)
}

export const mintToken = () => {
  const expiresIn = config.get('oauthStub.tokenTtlSeconds')
  const accessToken = randomUUID().replaceAll('-', '')

  evictOldestIfFull()
  tokens.set(accessToken, Date.now() + expiresIn * MILLISECONDS_PER_SECOND)

  return { accessToken, expiresIn }
}

export const isTokenValid = (accessToken) => {
  const expiresAt = tokens.get(accessToken)

  if (expiresAt === undefined) {
    return false
  }

  if (Date.now() >= expiresAt) {
    tokens.delete(accessToken)
    return false
  }

  return true
}

export const clearTokens = () => {
  tokens.clear()
}
