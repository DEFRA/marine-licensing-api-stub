import { FAIL_MODES, setEmpStubFailMode } from '../fail-mode.js'
import { loggablePayload } from './post-emp-features-stub.js'

const ADD_URL = '/ArcGIS/rest/services/Exemptions/FeatureServer/0/addFeatures'
const UPDATE_URL =
  '/ArcGIS/rest/services/Exemptions/FeatureServer/0/updateFeatures'

const featureFor = (caseReference, status) => ({
  attributes: { CaseReference: caseReference, Status: status },
  geometry: { x: -1.4, y: 55.0 }
})

describe('EMP feature service stub', () => {
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
    setEmpStubFailMode(FAIL_MODES.NONE)
  })

  // ArcGIS REST JS posts form-encoded with `features` as a JSON string.
  const addFeatures = (features, { asJson = false } = {}) =>
    server.inject({
      method: 'POST',
      url: ADD_URL,
      payload: asJson
        ? { f: 'json', token: 'secret-key', features }
        : {
            f: 'json',
            token: 'secret-key',
            features: JSON.stringify(features)
          }
    })

  test('returns one successful result per feature sent', async () => {
    const response = await addFeatures([
      featureFor('EXE/2026/00001', 'Scheduled'),
      featureFor('EXE/2026/00001', 'Scheduled')
    ])

    expect(response.statusCode).toBe(200)

    const { addResults } = JSON.parse(response.payload)
    expect(addResults).toHaveLength(2)
    expect(addResults.every((result) => result.success)).toBe(true)
    // Distinct ids: the caller stores every one and later updates them all.
    expect(new Set(addResults.map((result) => result.objectId)).size).toBe(2)
  })

  test('accepts a JSON body as well as a form-encoded one', async () => {
    const response = await addFeatures(
      [featureFor('EXE/2026/00002', 'Active')],
      {
        asJson: true
      }
    )

    const { addResults } = JSON.parse(response.payload)
    expect(addResults).toHaveLength(1)
    expect(addResults[0].success).toBe(true)
  })

  test('updateFeatures answers with updateResults, not addResults', async () => {
    const response = await server.inject({
      method: 'POST',
      url: UPDATE_URL,
      payload: {
        f: 'json',
        token: 'secret-key',
        features: JSON.stringify([
          { attributes: { OBJECTID: 1000, Status: 'Expired' } }
        ])
      }
    })

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload)
    expect(payload.updateResults).toHaveLength(1)
    expect(payload.addResults).toBeUndefined()
    // Echoes the targeted id back, so the caller keeps pointing at the same
    // feature rather than having its stored ids rewritten on every update.
    expect(payload.updateResults[0].objectId).toBe(1000)
  })

  // A caller that appends the operation itself sends .../addFeatures/addFeatures.
  // The real ArcGIS service serves that, so the stub must too - otherwise it
  // fails requests that work in every deployed environment.
  test('serves a doubled operation path as well as the canonical one', async () => {
    const response = await server.inject({
      method: 'POST',
      url: `${ADD_URL}/addFeatures`,
      payload: {
        f: 'json',
        features: JSON.stringify([featureFor('EXE/2026/00005', 'Scheduled')])
      }
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.payload).addResults).toHaveLength(1)
  })

  test('serves a doubled update path too', async () => {
    const response = await server.inject({
      method: 'POST',
      url: `${UPDATE_URL}/updateFeatures`,
      payload: {
        f: 'json',
        features: JSON.stringify([{ attributes: { OBJECTID: 1000 } }])
      }
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.payload).updateResults[0].objectId).toBe(1000)
  })

  describe('what gets logged', () => {
    const payload = {
      f: 'json',
      token: 'supersecret',
      rollbackOnFailure: 'true'
    }

    test('identifies added features by case reference', () => {
      const logged = loggablePayload(payload, [
        featureFor('EXE/2026/00123', 'Scheduled')
      ])

      expect(logged.caseReferences).toEqual(['EXE/2026/00123'])
      expect(logged.statuses).toEqual(['Scheduled'])
      // An add carries no OBJECTID, so the field is absent rather than [null].
      expect(logged).not.toHaveProperty('objectIds')
    })

    test('identifies updated features by object id', () => {
      const logged = loggablePayload(payload, [
        { attributes: { OBJECTID: 1000, Status: 'Withdrawn' } },
        { attributes: { OBJECTID: 1001, Status: 'Withdrawn' } }
      ])

      expect(logged.objectIds).toEqual([1000, 1001])
      expect(logged.statuses).toEqual(['Withdrawn', 'Withdrawn'])
      // An update never sends CaseReference, so it must not appear as [null].
      expect(logged).not.toHaveProperty('caseReferences')
    })

    test('never logs the api key', () => {
      const logged = loggablePayload(payload, [])

      expect(logged.token).toBe('[redacted]')
      expect(JSON.stringify(logged)).not.toContain('supersecret')
    })
  })

  test('returns no results when no features are sent', async () => {
    const response = await addFeatures([])

    const { addResults } = JSON.parse(response.payload)
    expect(addResults).toEqual([])
  })

  describe('fail mode', () => {
    test('fails addFeatures when set to add, leaving updateFeatures alone', async () => {
      setEmpStubFailMode(FAIL_MODES.ADD)

      const failed = await addFeatures([
        featureFor('EXE/2026/00003', 'Scheduled')
      ])
      const { addResults } = JSON.parse(failed.payload)
      expect(addResults[0].success).toBe(false)
      expect(addResults[0].error.description).toBe('Stubbed EMP failure')

      const updated = await server.inject({
        method: 'POST',
        url: UPDATE_URL,
        payload: {
          f: 'json',
          features: JSON.stringify([{ attributes: { OBJECTID: 1000 } }])
        }
      })
      expect(JSON.parse(updated.payload).updateResults[0].success).toBe(true)
    })

    test('fails both operations when set to all', async () => {
      setEmpStubFailMode(FAIL_MODES.ALL)

      const added = await addFeatures([featureFor('EXE/2026/00004', 'Active')])
      expect(JSON.parse(added.payload).addResults[0].success).toBe(false)

      const updated = await server.inject({
        method: 'POST',
        url: UPDATE_URL,
        payload: {
          f: 'json',
          features: JSON.stringify([{ attributes: { OBJECTID: 1000 } }])
        }
      })
      expect(JSON.parse(updated.payload).updateResults[0].success).toBe(false)
    })

    test('can be read and changed over HTTP', async () => {
      const set = await server.inject({
        method: 'PUT',
        url: '/emp-stub/fail-mode',
        payload: { mode: FAIL_MODES.UPDATE }
      })
      expect(set.statusCode).toBe(200)
      expect(JSON.parse(set.payload).mode).toBe(FAIL_MODES.UPDATE)

      const read = await server.inject({
        method: 'GET',
        url: '/emp-stub/fail-mode'
      })
      expect(JSON.parse(read.payload).mode).toBe(FAIL_MODES.UPDATE)
    })

    test('rejects an unknown mode rather than silently ignoring it', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/emp-stub/fail-mode',
        payload: { mode: 'sometimes' }
      })

      expect(response.statusCode).toBe(400)

      const read = await server.inject({
        method: 'GET',
        url: '/emp-stub/fail-mode'
      })
      expect(JSON.parse(read.payload).mode).toBe(FAIL_MODES.NONE)
    })
  })
})
