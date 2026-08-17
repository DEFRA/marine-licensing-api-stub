describe('Dynamics Submission Stub Endpoints', () => {
  let server

  beforeAll(async () => {
    const { createServer } = await import('#/server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 1000 })
  })

  test.each([
    ['/dynamics/flows/exemptions', 'submit'],
    ['/dynamics/flows/exemptions/withdraw', 'withdraw'],
    ['/dynamics/flows/exemptions/update', 'update'],
    ['/dynamics/flows/marine-licences', 'marineLicence']
  ])('POST %s returns 202', async (url, operation) => {
    const reference = `EXE/2025/${operation}`

    const response = await server.inject({
      method: 'POST',
      url,
      payload: { reference, projectName: 'Test project' }
    })

    expect(response.statusCode).toBe(202)
    expect(JSON.parse(response.payload)).toEqual({
      status: 'accepted',
      operation,
      reference
    })
  })

  test('ignores the api-version and sig query params real flow URLs carry', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/dynamics/flows/exemptions?api-version=2016-06-01&sig=abc123',
      payload: { reference: 'EXE/2025/00099' }
    })

    expect(response.statusCode).toBe(202)
    expect(JSON.parse(response.payload).reference).toBe('EXE/2025/00099')
  })

  test('POST to an unmatched flows path is not handled by the stub', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/dynamics/flows/unknown',
      payload: {}
    })

    expect(response.statusCode).toBe(404)
  })

  test('the submissions read-back endpoint no longer exists', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/dynamics/flows/submissions'
    })

    expect(response.statusCode).toBe(404)
  })
})
