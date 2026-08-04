describe('GET GOV.UK Policies Stub Endpoint', () => {
  let server

  beforeAll(async () => {
    const { createServer } = await import('#/server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 1000 })
  })

  test('GET /explore-marine-plans/api/policies returns the five ArcGIS stub policies', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/explore-marine-plans/api/policies'
    })

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload)

    expect(payload).toHaveLength(5)
    expect(payload.map((policy) => policy.code)).toEqual([
      'E-AGG-3',
      'E-MPA-1',
      'E-BIO-1',
      'E-BIO-2',
      'E-CAB-1'
    ])

    for (const policy of payload) {
      expect(policy).toEqual(
        expect.objectContaining({
          code: expect.any(String),
          policy: expect.any(String),
          policyAim: expect.any(String),
          whatIsIt: expect.any(String),
          whyIsItImportant: expect.any(String),
          howWillThisBeImplemented: expect.any(String),
          sector: expect.any(String),
          title: expect.any(String)
        })
      )
    }
  })

  test('GET to unrelated path is not handled by policies stub', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/explore-marine-plans/api/unknown'
    })

    expect(response.statusCode).toBe(404)
  })
})
