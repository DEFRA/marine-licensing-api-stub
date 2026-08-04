import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'
import policies from '../../data/policies.json' with { type: 'json' }

export const getPoliciesStubController = {
  options: {
    auth: false
  },
  handler: async (request, h) => {
    try {
      request.logger.info(
        {
          event: {
            action: 'policies_stub_request',
            category: 'web',
            type: 'access'
          },
          url: {
            path: request.path,
            query: request.query
          }
        },
        'GOV.UK policies stub request received'
      )

      request.logger.info(
        {
          event: {
            action: 'policies_stub_response',
            category: 'web',
            type: 'info'
          },
          policies: {
            count: policies.length
          }
        },
        'GOV.UK policies stub response sent'
      )

      return h.response(policies)
    } catch (error) {
      request.logger.error(
        structureErrorForECS(error),
        'Failed to return GOV.UK policies stub response'
      )
      throw Boom.internal('Failed to return GOV.UK policies stub response')
    }
  }
}
