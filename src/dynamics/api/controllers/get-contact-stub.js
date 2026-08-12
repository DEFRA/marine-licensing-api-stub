import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'
import { odataContext, resolveContact } from './contacts.js'

export const getContactStubController = {
  options: {
    auth: false
  },
  handler: async (request, h) => {
    const { contactId } = request.params

    try {
      request.logger.info(
        {
          event: {
            action: 'dynamics_contact_stub_request',
            category: 'web',
            type: 'access'
          },
          url: {
            path: request.path,
            query: request.query
          }
        },
        `Dynamics contact stub request received for ID ${contactId}`
      )

      const contact = resolveContact(contactId)

      if (!contact) {
        return h
          .response({
            error: {
              code: '0x80040217',
              message: `contact With Id = ${contactId} Does Not Exist`
            }
          })
          .code(404)
      }

      // $select is ignored - the backend only reads fullname and extra fields are harmless
      return h.response({
        '@odata.context': odataContext(request, 'contacts(fullname)/$entity'),
        '@odata.etag': 'W/"1000001"',
        ...contact
      })
    } catch (error) {
      request.logger.error(
        structureErrorForECS(error),
        'Failed to return Dynamics contact stub response'
      )
      throw Boom.internal('Failed to return Dynamics contact stub response')
    }
  }
}
