import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'

const require = createRequire(import.meta.url)
const addresses = require('../../data/addresses.json')

const MAXIMUM_RESULTS = '100'

const normalisePostcode = (postcode = '') =>
  postcode.toUpperCase().replaceAll(/\s+/g, '')

const buildResponse = (postcode, results) => ({
  header: {
    query: `postcode=${postcode}`,
    offset: '0',
    totalResults: String(results.length),
    format: 'JSON',
    dataset: 'DPA',
    language: 'EN',
    maximumResults: MAXIMUM_RESULTS,
    matchingTotalResults: String(results.length)
  },
  results,
  _info: {
    id: randomUUID(),
    dateTime: new Date().toISOString(),
    method: 'GET',
    service: 'Address Lookup v2',
    url: '/address-lookup/v2.1/addresses',
    nodeID: 'atom01',
    atomID: randomUUID()
  }
})

export const getAddressLookupStubController = {
  options: {
    auth: false
  },
  handler: async (request, h) => {
    try {
      const postcode = request.query.postcode ?? ''
      const results = addresses[normalisePostcode(postcode)] ?? []

      request.logger.info(
        {
          event: {
            action: 'address_lookup_stub_request',
            type: 'access'
          },
          url: {
            path: request.path
          },
          addressLookup: {
            resultCount: results.length
          }
        },
        'Address lookup stub request received'
      )

      return h.response(buildResponse(postcode, results))
    } catch (error) {
      request.logger.error(
        structureErrorForECS(error),
        'Failed to return address lookup stub response'
      )
      throw Boom.internal('Failed to return address lookup stub response')
    }
  }
}
