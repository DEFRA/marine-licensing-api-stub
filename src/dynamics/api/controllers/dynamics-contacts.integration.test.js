// Sally Self and Jason Bourne, as seeded into the local defra-id stub
const KNOWN_CONTACT_ID = '16d5ffcc-3ef3-ee11-a1fe-000d3a86c43e'
const KNOWN_USER_ID = 'f0c19ba9-df1f-4cb8-bbe7-8078f13eabea'
const SECOND_CONTACT_ID = 'bf5edec1-79eb-ee11-a1fe-000d3a86c43e'
const UNKNOWN_CONTACT_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
const SEEDED_CONTACT_COUNT = 5

const contactsUrl = (filter) =>
  `/dynamics/api/data/v9.2/contacts?$select=fullname,contactid&$filter=${encodeURIComponent(filter)}`

describe('Dynamics Contact Stub Endpoints', () => {
  let server

  beforeAll(async () => {
    const { createServer } = await import('#/server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 1000 })
  })

  describe('POST /dynamics/oauth2/v2.0/token', () => {
    test('returns a bearer access token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/dynamics/oauth2/v2.0/token',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        payload:
          'client_id=stub-client-id&client_secret=stub-client-secret&grant_type=client_credentials&scope=stub/.default'
      })

      expect(response.statusCode).toBe(200)

      const payload = JSON.parse(response.payload)

      expect(payload).toEqual(
        expect.objectContaining({
          token_type: 'Bearer',
          access_token: expect.any(String)
        })
      )
      expect(payload.access_token).not.toBe('')
    })
  })

  describe('GET /dynamics/api/data/v9.2/contacts({contactId})', () => {
    test('returns the fixture fullname for a known contact', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/dynamics/api/data/v9.2/contacts(${KNOWN_CONTACT_ID})?$select=fullname`
      })

      expect(response.statusCode).toBe(200)

      const payload = JSON.parse(response.payload)

      expect(payload).toEqual(
        expect.objectContaining({
          contactid: KNOWN_CONTACT_ID,
          fullname: 'Sally Self',
          firstname: 'Sally',
          lastname: 'Self'
        })
      )
      expect(payload).not.toHaveProperty('userid')
      expect(payload['@odata.context']).toContain('contacts')
    })

    test('resolves a defra-id userId to the same contact', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/dynamics/api/data/v9.2/contacts(${KNOWN_USER_ID})?$select=fullname`
      })

      expect(response.statusCode).toBe(200)

      const payload = JSON.parse(response.payload)

      expect(payload.fullname).toBe('Sally Self')
      // the id that was asked for is echoed back
      expect(payload.contactid).toBe(KNOWN_USER_ID)
    })

    test('resolves a known contact id regardless of case', async () => {
      const upperCased = KNOWN_CONTACT_ID.toUpperCase()

      const response = await server.inject({
        method: 'GET',
        url: `/dynamics/api/data/v9.2/contacts(${upperCased})?$select=fullname`
      })

      expect(response.statusCode).toBe(200)

      const payload = JSON.parse(response.payload)

      expect(payload.fullname).toBe('Sally Self')
      expect(payload.contactid).toBe(upperCased)
    })

    test('generates a placeholder name for an unknown contact', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/dynamics/api/data/v9.2/contacts(${UNKNOWN_CONTACT_ID})?$select=fullname`
      })

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.payload).fullname).toBe('Test User 3fa85f64')
    })

    test('returns the entity odata context and etag', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/dynamics/api/data/v9.2/contacts(${KNOWN_CONTACT_ID})?$select=fullname`
      })

      const payload = JSON.parse(response.payload)

      expect(payload['@odata.context']).toMatch(
        /\$metadata#contacts\(fullname\)\/\$entity$/
      )
      expect(payload['@odata.etag']).toBe('W/"1000001"')
    })

    test('returns a Dynamics shaped 404 for a non-GUID contact id', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/dynamics/api/data/v9.2/contacts(not-a-guid)?$select=fullname'
      })

      expect(response.statusCode).toBe(404)
      expect(JSON.parse(response.payload).error).toEqual({
        code: '0x80040217',
        message: 'contact With Id = not-a-guid Does Not Exist'
      })
    })
  })

  describe('GET /dynamics/api/data/v9.2/contacts', () => {
    test('returns one entry per contactid in the $filter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: contactsUrl(
          `contactid eq '${KNOWN_CONTACT_ID}' or contactid eq '${SECOND_CONTACT_ID}'`
        )
      })

      expect(response.statusCode).toBe(200)

      const { value } = JSON.parse(response.payload)

      expect(value).toHaveLength(2)
      expect(
        value.map(({ contactid, fullname }) => [contactid, fullname])
      ).toEqual([
        [KNOWN_CONTACT_ID, 'Sally Self'],
        [SECOND_CONTACT_ID, 'Jason Bourne']
      ])
    })

    test('entries expose only the etag, contactid and fullname', async () => {
      const response = await server.inject({
        method: 'GET',
        url: contactsUrl(`contactid eq '${KNOWN_CONTACT_ID}'`)
      })

      const { value } = JSON.parse(response.payload)

      expect(value[0]).toEqual({
        '@odata.etag': 'W/"1000001"',
        contactid: KNOWN_CONTACT_ID,
        fullname: 'Sally Self'
      })
    })

    test('generates a placeholder entry for an unknown but valid GUID', async () => {
      const response = await server.inject({
        method: 'GET',
        url: contactsUrl(`contactid eq '${UNKNOWN_CONTACT_ID}'`)
      })

      const { value } = JSON.parse(response.payload)

      expect(value).toEqual([
        {
          '@odata.etag': 'W/"1000001"',
          contactid: UNKNOWN_CONTACT_ID,
          fullname: 'Test User 3fa85f64'
        }
      ])
    })

    test('resolves a defra-id userId in the $filter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: contactsUrl(`contactid eq '${KNOWN_USER_ID}'`)
      })

      const { value } = JSON.parse(response.payload)

      expect(value).toEqual([
        expect.objectContaining({
          contactid: KNOWN_USER_ID,
          fullname: 'Sally Self'
        })
      ])
    })

    test('drops a $filter clause whose id is not a GUID', async () => {
      // Real Dynamics would reject the whole query with a 400 - the stub is forgiving
      const response = await server.inject({
        method: 'GET',
        url: contactsUrl(
          `contactid eq 'not-a-guid' or contactid eq '${KNOWN_CONTACT_ID}'`
        )
      })

      expect(response.statusCode).toBe(200)

      const { value } = JSON.parse(response.payload)

      expect(value).toHaveLength(1)
      expect(value[0].contactid).toBe(KNOWN_CONTACT_ID)
    })

    test('returns all fixture contacts when no $filter is given', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/dynamics/api/data/v9.2/contacts'
      })

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.payload).value).toHaveLength(
        SEEDED_CONTACT_COUNT
      )
    })

    test('treats an empty $filter as no filter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/dynamics/api/data/v9.2/contacts?$filter='
      })

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.payload).value).toHaveLength(
        SEEDED_CONTACT_COUNT
      )
    })

    test('returns the collection odata context', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/dynamics/api/data/v9.2/contacts'
      })

      expect(JSON.parse(response.payload)['@odata.context']).toMatch(
        /\$metadata#contacts\(fullname,contactid\)$/
      )
    })
  })

  test('GET to unrelated dynamics path is not handled by the stub', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/dynamics/api/data/v9.2/accounts'
    })

    expect(response.statusCode).toBe(404)
  })
})
