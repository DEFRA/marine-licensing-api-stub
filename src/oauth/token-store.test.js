import { config } from '#/config.js'
import { mintToken, isTokenValid, clearTokens } from '#/oauth/token-store.js'

describe('#tokenStore', () => {
  afterEach(() => {
    clearTokens()
    vi.useRealTimers()
    config.set('oauthStub.tokenTtlSeconds', 3600)
  })

  test('a freshly minted token is valid', () => {
    const { accessToken, expiresIn } = mintToken()

    expect(expiresIn).toBe(3600)
    expect(isTokenValid(accessToken)).toBe(true)
  })

  test('an unknown token is not valid', () => {
    expect(isTokenValid('not-a-real-token')).toBe(false)
  })

  test('a token stops being valid once its lifetime has elapsed', () => {
    vi.useFakeTimers()
    config.set('oauthStub.tokenTtlSeconds', 5)

    const { accessToken } = mintToken()

    expect(isTokenValid(accessToken)).toBe(true)

    vi.advanceTimersByTime(5001)

    expect(isTokenValid(accessToken)).toBe(false)
  })

  test('evicts the oldest token once the store is full', () => {
    const { accessToken: oldest } = mintToken()

    for (let i = 0; i < 99; i++) {
      mintToken()
    }

    expect(isTokenValid(oldest)).toBe(true)

    mintToken()

    expect(isTokenValid(oldest)).toBe(false)
  })

  test('clearTokens invalidates everything', () => {
    const { accessToken } = mintToken()

    clearTokens()

    expect(isTokenValid(accessToken)).toBe(false)
  })
})
