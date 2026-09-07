import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'
import { isTokenValid } from '#/oauth/token.js'

const require = createRequire(import.meta.url)
const addresses = require('../../data/addresses.json')

const MAXIMUM_RESULTS = 100
const HTTP_STATUS_NO_CONTENT = 204
const HTTP_STATUS_BAD_REQUEST = 400

// The auth-scheme is case-insensitive per RFC 7235, and the real gateway treats it that way
const BEARER_PATTERN = /^bearer\s+(\S.*)$/i

// Reserved postcode that makes the stub answer 204 No Content, so the frontend's
// no-content branch is reachable end to end.
const NO_CONTENT_POSTCODE = 'NE991NC'

// Reserved postcode that makes the stub answer 400 the way the real API does for a
// postcode it will not serve, nesting the reason under error.message rather than in a
// Boom envelope.
const REJECTED_POSTCODE = 'NE992NC'

const buildRejectedPostcodeResponse = (path, normalisedPostcode) => ({
  error: {
    statuscode: HTTP_STATUS_BAD_REQUEST,
    message: `Requested postcode must contain a minimum of the sector plus 1 digit of the district e.g. SO1. Requested postcode was ${normalisedPostcode}`
  },
  _info: {
    id: randomUUID(),
    dateTime: new Date().toISOString(),
    method: 'GET',
    service: 'Address Lookup v2',
    url: path,
    nodeID: 'atom01',
    atomID: randomUUID()
  }
})

const normalisePostcode = (postcode) =>
  postcode.toUpperCase().replaceAll(/\s+/g, '')

// hapi turns a repeated ?postcode= into an array; take the first value rather than
// letting it blow up on toUpperCase
const firstQueryValue = (value) => (Array.isArray(value) ? value[0] : value)

// Callers send ?maxresults= to cap the set they get back. A fraction is truncated rather
// than rejected, and anything else unusable falls back to the stub's own ceiling rather
// than erroring, which is what the real API does.
const parseMaximumResults = (value) => {
  const requested = Math.floor(Number(firstQueryValue(value)))

  if (!Number.isInteger(requested) || requested < 1) {
    return MAXIMUM_RESULTS
  }

  return Math.min(requested, MAXIMUM_RESULTS)
}

const extractBearerToken = (authorizationHeader) =>
  BEARER_PATTERN.exec(authorizationHeader)?.[1].trim() ?? null

// totalResults is how many the postcode has, not how many are being returned. Consumers
// compare the two to tell that a set was capped, so it must be the pre-cap count.
const buildResponse = (
  path,
  postcode,
  results,
  { totalResults, maximumResults }
) => ({
  header: {
    query: `postcode=${postcode}`,
    offset: '0',
    totalResults: String(totalResults),
    format: 'JSON',
    dataset: 'DPA',
    language: 'EN',
    maximumResults: String(maximumResults),
    matchingTotalResults: String(totalResults)
  },
  results,
  _info: {
    id: randomUUID(),
    dateTime: new Date().toISOString(),
    method: 'GET',
    service: 'Address Lookup v2',
    url: path,
    nodeID: 'atom01',
    atomID: randomUUID()
  }
})

export const getAddressLookupStubController = {
  options: {
    auth: false
  },
  handler: async (request, h) => {
    // Deliberately outside the try below: the 401 must reach the client as a 401, not be
    // swallowed by the catch and re-thrown as a 500
    const token = extractBearerToken(request.headers.authorization ?? '')

    if (!token || !isTokenValid(token)) {
      request.logger.info(
        {
          event: {
            action: 'address_lookup_stub_unauthorized',
            category: 'web',
            type: 'access',
            outcome: 'failure'
          },
          url: { path: request.path }
        },
        'Address lookup stub rejected an unauthorized request'
      )

      throw Boom.unauthorized()
    }

    try {
      const postcode = firstQueryValue(request.query.postcode) ?? ''
      const normalisedPostcode = normalisePostcode(postcode)

      if (normalisedPostcode === NO_CONTENT_POSTCODE) {
        request.logger.info(
          {
            event: {
              action: 'address_lookup_stub_no_content',
              category: 'web',
              type: 'access',
              outcome: 'success'
            },
            url: { path: request.path }
          },
          'Address lookup stub returned no content for the reserved postcode'
        )

        return h.response().code(HTTP_STATUS_NO_CONTENT)
      }

      if (normalisedPostcode === REJECTED_POSTCODE) {
        request.logger.info(
          {
            event: {
              action: 'address_lookup_stub_rejected_postcode',
              category: 'web',
              type: 'access',
              outcome: 'failure'
            },
            url: { path: request.path }
          },
          'Address lookup stub rejected the reserved postcode'
        )

        return h
          .response(
            buildRejectedPostcodeResponse(request.path, normalisedPostcode)
          )
          .code(HTTP_STATUS_BAD_REQUEST)
      }

      const matches = addresses[normalisedPostcode] ?? []
      const maximumResults = parseMaximumResults(request.query.maxresults)
      const results = matches.slice(0, maximumResults)

      request.logger.info(
        {
          event: {
            action: 'address_lookup_stub_request',
            category: 'web',
            type: 'access',
            outcome: 'success'
          },
          url: {
            path: request.path
          }
        },
        'Address lookup stub request received'
      )

      return h.response(
        buildResponse(request.path, postcode, results, {
          totalResults: matches.length,
          maximumResults
        })
      )
    } catch (error) {
      request.logger.error(
        structureErrorForECS(error),
        'Failed to return address lookup stub response'
      )
      throw Boom.internal('Failed to return address lookup stub response')
    }
  }
}
