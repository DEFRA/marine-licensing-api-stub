describe('GET Address Lookup Stub Endpoint', () => {
  let server
  let accessToken

  const mintToken = async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/oauth2/v2.0/token',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: 'local-stub-client-id',
        client_secret: 'local-stub-client-secret'
      }).toString()
    })

    return JSON.parse(response.payload).access_token
  }

  const lookup = (postcode, headers = {}) =>
    server.inject({
      method: 'GET',
      url: `/api/address-lookup/v2.1/addresses?postcode=${encodeURIComponent(postcode)}`,
      headers: { authorization: `Bearer ${accessToken}`, ...headers }
    })

  beforeAll(async () => {
    const { createServer } = await import('#/server.js')
    server = await createServer()
    await server.initialize()
    accessToken = await mintToken()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 1000 })
  })

  test('returns the address for the known test postcode in the real API response shape', async () => {
    const response = await lookup('NE4 7AR')

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload)

    expect(payload.header).toEqual(
      expect.objectContaining({
        query: 'postcode=NE4 7AR',
        totalResults: '1',
        matchingTotalResults: '1',
        format: 'JSON',
        dataset: 'DPA'
      })
    )
    expect(payload._info).toEqual(
      expect.objectContaining({ service: 'Address Lookup v2', method: 'GET' })
    )
    expect(payload.results).toHaveLength(1)
    expect(payload.results[0]).toEqual(
      expect.objectContaining({
        buildingName: 'TYNESIDE HOUSE',
        postcode: 'NE4 7AR',
        uprn: '4510116883'
      })
    )
  })

  test.each(['NE4 7AR', 'ne4 7ar', 'NE47AR', '  ne4   7ar '])(
    'matches postcode "%s" regardless of case and whitespace',
    async (postcode) => {
      const response = await lookup(postcode)

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.payload).results).toHaveLength(1)
    }
  )

  test('returns many results for a multi-address postcode', async () => {
    const response = await lookup('NE1 1EE')

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload)

    expect(payload.results).toHaveLength(3)
    expect(payload.header.totalResults).toBe('3')
  })

  test('returns zero results for an unknown postcode', async () => {
    const response = await lookup('ZZ1 1ZZ')

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload)

    expect(payload.results).toEqual([])
    expect(payload.header.totalResults).toBe('0')
  })

  test('returns zero results when no postcode is supplied', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/address-lookup/v2.1/addresses',
      headers: { authorization: `Bearer ${accessToken}` }
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.payload).results).toEqual([])
  })

  test('returns 204 No Content for the reserved no-content postcode', async () => {
    const response = await lookup('NE99 1NC')

    expect(response.statusCode).toBe(204)
    expect(response.payload).toBe('')
  })

  describe('authorization', () => {
    test('rejects a request with no Authorization header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/address-lookup/v2.1/addresses?postcode=NE4%207AR'
      })

      expect(response.statusCode).toBe(401)
    })

    test.each([
      ['a non-Bearer scheme', 'Basic abc123'],
      ['an empty Bearer token', 'Bearer '],
      ['an unrecognised token', 'Bearer not-a-real-token']
    ])('rejects %s with 401', async (_description, authorization) => {
      const response = await lookup('NE4 7AR', { authorization })

      expect(response.statusCode).toBe(401)
    })
  })
})
