import {
  clearPayments,
  MAX_STORED_PAYMENTS,
  getStoredPayment
} from '#/govpay/store.js'

const AUTH_HEADERS = { authorization: 'Bearer test-api-key' }

const validPayment = {
  amount: 5000,
  reference: 'MLA/2026/10001',
  description: 'Marine licence application fee',
  return_url: 'http://localhost:3000/marine-licence/payment/return/abc'
}

describe('GOV.UK Pay stub', () => {
  let server

  beforeAll(async () => {
    const { createServer } = await import('#/server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 1000 })
  })

  beforeEach(() => {
    clearPayments()
  })

  const createPayment = async (payload = validPayment) => {
    const response = await server.inject({
      method: 'POST',
      url: '/govpay/v1/payments',
      headers: AUTH_HEADERS,
      payload
    })
    return { response, body: JSON.parse(response.payload) }
  }

  const getPayment = async (paymentId) => {
    const response = await server.inject({
      method: 'GET',
      url: `/govpay/v1/payments/${paymentId}`,
      headers: AUTH_HEADERS
    })
    return { response, body: JSON.parse(response.payload) }
  }

  const hostedPath = (body) => new URL(body._links.next_url.href).pathname

  const chooseOutcome = (path, outcome) =>
    server.inject({
      method: 'POST',
      url: path,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: `outcome=${outcome}`
    })

  test('POST /govpay/v1/payments creates a payment with a next_url', async () => {
    const { response, body } = await createPayment()

    expect(response.statusCode).toBe(201)
    expect(body).toMatchObject({
      amount: 5000,
      reference: 'MLA/2026/10001',
      return_url: validPayment.return_url,
      state: { status: 'created', finished: false }
    })
    expect(body.payment_id).toEqual(expect.any(String))
    expect(body._links.next_url.href).toMatch(
      new RegExp(`^http://localhost:3001/govpay/pay/${body.payment_id}/`)
    )
  })

  test('POST /govpay/v1/payments rejects a request without a Bearer key', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/govpay/v1/payments',
      payload: validPayment
    })

    expect(response.statusCode).toBe(401)
  })

  test('POST /govpay/v1/payments rejects a reference over 255 characters', async () => {
    const { response } = await createPayment({
      ...validPayment,
      reference: 'x'.repeat(256)
    })

    expect(response.statusCode).toBe(400)
  })

  test('GET /govpay/v1/payments/{id} returns 404 for an unknown payment', async () => {
    const { response } = await getPayment('unknown')

    expect(response.statusCode).toBe(404)
  })

  test('GET issues a fresh next_url and the previous one stops working', async () => {
    const { body: created } = await createPayment()
    const { body: fetched } = await getPayment(created.payment_id)

    expect(hostedPath(fetched)).not.toBe(hostedPath(created))

    const stale = await server.inject({
      method: 'GET',
      url: hostedPath(created)
    })
    expect(stale.statusCode).toBe(404)

    const fresh = await server.inject({
      method: 'GET',
      url: hostedPath(fetched)
    })
    expect(fresh.statusCode).toBe(200)
    expect(fresh.payload).toContain('MLA/2026/10001')
  })

  test('the hosted page escapes payment text', async () => {
    const { body } = await createPayment({
      ...validPayment,
      description: '<script>alert(1)</script>'
    })

    const page = await server.inject({ method: 'GET', url: hostedPath(body) })

    expect(page.payload).not.toContain('<script>')
    expect(page.payload).toContain('&lt;script&gt;')
  })

  test.each([
    ['pay', { status: 'success', finished: true }],
    ['decline', { status: 'failed', code: 'P0010', finished: true }],
    ['expire', { status: 'failed', code: 'P0020', finished: true }],
    ['cancel', { status: 'failed', code: 'P0030', finished: true }],
    ['error', { status: 'error', code: 'P0050', finished: true }]
  ])(
    'choosing %s sets the state and redirects to return_url',
    async (outcome, expectedState) => {
      const { body: created } = await createPayment()

      const response = await chooseOutcome(hostedPath(created), outcome)

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(validPayment.return_url)

      const { body: fetched } = await getPayment(created.payment_id)
      expect(fetched.state).toMatchObject(expectedState)
      expect(fetched._links.next_url).toBeUndefined()
    }
  )

  test('a next_url cannot be used twice', async () => {
    const { body } = await createPayment()
    const path = hostedPath(body)

    await chooseOutcome(path, 'pay')
    const second = await chooseOutcome(path, 'decline')

    expect(second.statusCode).toBe(404)
    expect(getStoredPayment(body.payment_id).payment.state.status).toBe(
      'success'
    )
  })

  test('rejects an unknown outcome', async () => {
    const { body } = await createPayment()

    const response = await chooseOutcome(hostedPath(body), 'refund')

    expect(response.statusCode).toBe(400)
  })

  test('POST /govpay/test/payments/{id}/expire forces P0020', async () => {
    const { body: created } = await createPayment()

    const response = await server.inject({
      method: 'POST',
      url: `/govpay/test/payments/${created.payment_id}/expire`
    })

    expect(response.statusCode).toBe(200)
    const { body: fetched } = await getPayment(created.payment_id)
    expect(fetched.state).toMatchObject({
      status: 'failed',
      code: 'P0020',
      finished: true
    })
  })

  test('POST /govpay/test/payments/{id}/expire returns 409 for a finished payment', async () => {
    const { body } = await createPayment()
    await chooseOutcome(hostedPath(body), 'pay')

    const response = await server.inject({
      method: 'POST',
      url: `/govpay/test/payments/${body.payment_id}/expire`
    })

    expect(response.statusCode).toBe(409)
  })

  test('evicts the oldest payment once the store is full', async () => {
    const { body: first } = await createPayment()
    for (let i = 1; i < MAX_STORED_PAYMENTS; i++) {
      await createPayment()
    }

    expect(getStoredPayment(first.payment_id)).toBeDefined()
    await createPayment()
    expect(getStoredPayment(first.payment_id)).toBeUndefined()
  })
})
