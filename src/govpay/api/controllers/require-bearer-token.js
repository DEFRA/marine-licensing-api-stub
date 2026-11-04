import Boom from '@hapi/boom'

export const requireBearerToken = (request, h) => {
  const authorization = request.headers.authorization ?? ''
  if (!/^Bearer \S+$/.test(authorization)) {
    throw Boom.unauthorized('Missing or malformed Bearer API key')
  }
  return h.continue
}
