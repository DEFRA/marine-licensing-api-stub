import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'
import { getSubmissions } from './submissions.js'

export const getSubmissionsStubController = {
  options: {
    auth: false
  },
  handler: async (request, h) => {
    try {
      const submissions = getSubmissions()

      return h.response({ count: submissions.length, submissions })
    } catch (error) {
      request.logger.error(
        structureErrorForECS(error),
        'Failed to return recorded Dynamics submissions'
      )
      throw Boom.internal('Failed to return recorded Dynamics submissions')
    }
  }
}
