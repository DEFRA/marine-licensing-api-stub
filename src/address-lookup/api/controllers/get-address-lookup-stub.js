import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'
import { isTokenValid } from '#/oauth/token.js'

const require = createRequire(import.meta.url)
const addresses = require('../../data/addresses.json')

const MAXIMUM_RESULTS = 100
const HTTP_STATUS_NO_CONTENT = 204
const BEARER_PREFIX = 'Bearer '

// Reserved postcode that makes the stub answer 204 No Content, so the frontend's
// no-content branch is reachable end to end.
const NO_CONTENT_POSTCODE = 'NE991NC'

const normalisePostcode = (postcode) =>
  postcode.toUpperCase().replaceAll(/\s+/g, '')

// hapi turns a repeated ?postcode= into an array; take the first value rather than
// letting it blow up on toUpperCase
const firstQueryValue = (value) => (Array.isArray(value) ? value[0] : value)

// Callers send ?maxresults= to cap the set they get back. Anything unusable falls back to
// the stub's own ceiling rather than erroring, which is what the real API does.
const parseMaximumResults = (value) => {
  const requested = Number(firstQueryValue(value))

  if (!Number.isInteger(requested) || requested < 1) {
    return MAXIMUM_RESULTS
  }

  return Math.min(requested, MAXIMUM_RESULTS)
}

// The auth-scheme is case-insensitive per RFC 7235, and the real gateway treats it that way
const extractBearerToken = (authorizationHeader) => {
  if (
    authorizationHeader.slice(0, BEARER_PREFIX.length).toLowerCase() !==
    BEARER_PREFIX.toLowerCase()
  ) {
    return null
  }

  return authorizationHeader.slice(BEARER_PREFIX.length).trim() || null
}

// totalResults is how many the postcode has, not how many are being returned. Consumers
// compare the two to tell that a set was capped, so it must be the pre-cap count.
const buildResponse = (
  request,
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
    url: request.path,
    nodeID: 'atom01',
    atomID: randomUUID()
  }
})

export const getAddressLookupStubController = {
  options: {
    auth: false
  },
  handler: async (request, h) => {
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
          },
          addressLookup: {
            resultCount: results.length,
            totalResults: matches.length
          }
        },
        'Address lookup stub request received'
      )

      return h.response(
        buildResponse(request, postcode, results, {
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
