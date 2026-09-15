import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'
import { empStubFailMode, FAIL_MODES } from '../fail-mode.js'

const FIRST_OBJECT_ID = 1000

/**
 * ArcGIS REST JS posts form-encoded, with `features` as a JSON string. It will
 * also accept a JSON body, so both shapes are handled - a stub that only parsed
 * one would fail in a way that looks like the caller's bug.
 */
const parseFeatures = (payload) => {
  const raw = payload?.features

  if (Array.isArray(raw)) {
    return raw
  }

  if (typeof raw !== 'string') {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

// The token is the EMP API key. Never log it.
const loggablePayload = (payload, features) => {
  const { token, features: _features, ...rest } = payload ?? {}

  return {
    ...rest,
    token: token ? '[redacted]' : undefined,
    featureCount: features.length,
    statuses: features.map((feature) => feature?.attributes?.Status),
    caseReferences: features.map(
      (feature) => feature?.attributes?.CaseReference
    )
  }
}

/**
 * One result per feature sent. The caller maps every result to an objectId and
 * treats a missing one as a failure, so a stub returning a single fixed result
 * would silently lose ids whenever an exemption has more than one site.
 */
const buildResults = (features, shouldFail) =>
  features.map((feature, index) => {
    // An update names the feature it targets, so echo that id back rather than
    // inventing one - the caller stores whatever comes back as the feature's id.
    const objectId = feature?.attributes?.OBJECTID ?? FIRST_OBJECT_ID + index

    if (shouldFail) {
      return {
        objectId,
        success: false,
        error: { code: 400, description: 'Stubbed EMP failure' }
      }
    }

    return { objectId, success: true }
  })

const empFeaturesStub = (operation, resultsKey) => ({
  options: {
    auth: false,
    payload: {
      parse: true,
      output: 'data'
    }
  },
  handler: async (request, h) => {
    try {
      const features = parseFeatures(request.payload)
      const shouldFail =
        empStubFailMode() === FAIL_MODES.ALL || empStubFailMode() === operation

      request.logger.info(
        {
          event: {
            action: `emp_stub_${operation}`,
            category: 'web',
            type: 'access',
            outcome: shouldFail ? 'failure' : 'success'
          },
          url: { path: request.path, query: request.query },
          http: { request: { method: request.method.toUpperCase() } }
        },
        `EMP stub ${operation}: ${JSON.stringify(loggablePayload(request.payload, features))}`
      )

      return h.response({
        [resultsKey]: buildResults(features, shouldFail)
      })
    } catch (error) {
      request.logger.error(
        structureErrorForECS(error),
        `Failed to return EMP stub ${operation} response`
      )
      throw Boom.internal(`Failed to return EMP stub ${operation} response`)
    }
  }
})

export const postEmpAddFeaturesStubController = empFeaturesStub(
  FAIL_MODES.ADD,
  'addResults'
)

export const postEmpUpdateFeaturesStubController = empFeaturesStub(
  FAIL_MODES.UPDATE,
  'updateResults'
)
