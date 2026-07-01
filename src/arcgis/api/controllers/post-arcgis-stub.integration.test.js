describe('POST ArcGIS Stub Endpoint', () => {
  let server

  beforeAll(async () => {
    const { createServer } = await import('#/server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 1000 })
  })

  test('POST /ArcGIS/.../query returns ArcGIS response with five policies', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/ArcGIS/rest/services/PolicyData_MDP/FeatureServer/0/query?f=json',
      payload: {
        where: '1=1'
      }
    })

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload)

    expect(payload.objectIdFieldName).toBe('OBJECTID_12')
    expect(payload.features).toHaveLength(5)
    expect(
      payload.features.map((feature) => feature.attributes.PolicyCode)
    ).toEqual(['E-AGG-3', 'E-MPA-1', 'E-BIO-1', 'E-BIO-2', 'E-CAB-1'])
  })

  test('POST to unrelated path is not handled by ArcGIS stub', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/some-other-stub/query'
    })

    expect(response.statusCode).toBe(404)
  })
})
