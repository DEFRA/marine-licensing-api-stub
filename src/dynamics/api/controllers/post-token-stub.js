import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'

const oneHourInSeconds = 3599

export const postTokenStubController = {
  options: {
    auth: false,
    payload: {
      parse: true,
      output: 'data',
      allow: [
        'application/x-www-form-urlencoded',
        'application/json',
        'text/plain'
      ]
    }
  },
  handler: async (request, h) => {
    try {
      // The client secret is deliberately never logged
      request.logger.info(
        {
          event: {
            action: 'dynamics_token_stub_request',
            category: 'authentication',
            type: 'access',
            outcome: 'success'
          },
          url: {
            path: request.path
          }
        },
        `Dynamics token stub request received for client ${request.payload?.client_id ?? 'unknown'}`
      )

      return h.response({
        token_type: 'Bearer',
        expires_in: oneHourInSeconds,
        ext_expires_in: oneHourInSeconds,
        access_token: 'stub-dynamics-access-token'
      })
    } catch (error) {
      request.logger.error(
        structureErrorForECS(error),
        'Failed to return Dynamics token stub response'
      )
      throw Boom.internal('Failed to return Dynamics token stub response')
    }
  }
}
