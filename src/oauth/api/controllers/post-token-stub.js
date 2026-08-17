import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'
import { mintToken } from '#/oauth/token.js'

const GRANT_TYPE_CLIENT_CREDENTIALS = 'client_credentials'
const HTTP_STATUS_BAD_REQUEST = 400

// Stricter than it needs to be, deliberately. The values themselves are never checked, but a
// missing client id or secret locally almost always means a misconfigured env var, and failing
// loudly here is far cheaper to diagnose than a 401 three layers downstream.
const isValidTokenRequest = (payload) =>
  payload.grant_type === GRANT_TYPE_CLIENT_CREDENTIALS &&
  Boolean(payload.client_id) &&
  Boolean(payload.client_secret)

// Serves every OAuth token URL the services are pointed at: the address lookup gateway's
// (`/oauth2/v2.0/token`, with and without the real tenant prefix) and Dynamics'
// (`/dynamics/oauth2/v2.0/token`). Both are Entra client-credentials flows, so one stub covers
// them; only the address lookup stub validates the token it is later sent.
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
      const payload = request.payload ?? {}

      if (!isValidTokenRequest(payload)) {
        request.logger.info(
          {
            event: {
              action: 'oauth_token_stub_rejected',
              category: 'authentication',
              type: 'access',
              outcome: 'failure'
            },
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

      // The client secret is deliberately never logged
      request.logger.info(
        {
          event: {
            action: 'oauth_token_stub_issued',
            category: 'authentication',
            type: 'access',
            outcome: 'success'
          },
          url: { path: request.path },
          oauth: { expiresIn }
        },
        `OAuth token stub issued an access token for client ${payload.client_id}`
      )

      return h.response({
        token_type: 'Bearer',
        expires_in: expiresIn,
        // Real Entra ID returns both; the Dynamics stub this replaced did too
        ext_expires_in: expiresIn,
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
