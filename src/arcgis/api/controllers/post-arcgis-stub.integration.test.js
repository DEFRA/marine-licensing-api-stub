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

  test('POST /{any*} returns ArcGIS response with five policies', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/arcgis/query?url=https%3A%2F%2Fexample.com%2Ffeature-server&f=json',
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
})
