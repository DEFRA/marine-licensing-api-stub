import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'
import { mintToken } from '#/oauth/token-store.js'

const GRANT_TYPE_CLIENT_CREDENTIALS = 'client_credentials'
const HTTP_STATUS_BAD_REQUEST = 400

const isValidTokenRequest = (payload) =>
  payload.grant_type === GRANT_TYPE_CLIENT_CREDENTIALS &&
  Boolean(payload.client_id) &&
  Boolean(payload.client_secret)

export const postOauthTokenStubController = {
  options: {
    auth: false
  },
  handler: async (request, h) => {
    try {
      const payload = request.payload ?? {}

      if (!isValidTokenRequest(payload)) {
        request.logger.info(
          {
            event: { action: 'oauth_token_stub_rejected', type: 'access' },
            url: { path: request.path }
          },
          'OAuth token stub rejected an invalid token request'
        )

        return h
          .response({
            error: 'invalid_request',
            error_description:
              'Expected grant_type=client_credentials with client_id and client_secret'
          })
          .code(HTTP_STATUS_BAD_REQUEST)
      }

      const { accessToken, expiresIn } = mintToken()

      request.logger.info(
        {
          event: { action: 'oauth_token_stub_issued', type: 'access' },
          url: { path: request.path },
          oauth: { expiresIn }
        },
        'OAuth token stub issued an access token'
      )

      return h.response({
        token_type: 'Bearer',
        expires_in: expiresIn,
        access_token: accessToken
      })
    } catch (error) {
      request.logger.error(
        structureErrorForECS(error),
        'Failed to return OAuth token stub response'
      )
      throw Boom.internal('Failed to return OAuth token stub response')
    }
  }
}
