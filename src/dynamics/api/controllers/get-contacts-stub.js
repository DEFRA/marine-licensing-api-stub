import Boom from '@hapi/boom'
import { structureErrorForECS } from '#/common/helpers/logging/logger.js'
import { allContacts, odataContext, resolveContact } from './contacts.js'

const CONTACT_ID_CLAUSE = /contactid eq '([^']*)'/gi

const contactIdsFromFilter = (filter) =>
  [...filter.matchAll(CONTACT_ID_CLAUSE)].map(([, contactId]) => contactId)

export const getContactsStubController = {
  options: {
    auth: false
  },
  handler: async (request, h) => {
    try {
      const filter = request.query.$filter

      request.logger.info(
        {
          event: {
            action: 'dynamics_contacts_stub_request',
            category: 'web',
            type: 'access'
          },
          url: {
            path: request.path,
            query: request.query
          }
        },
        'Dynamics contacts stub request received'
      )

      const contacts = filter
        ? contactIdsFromFilter(filter)
            .map(resolveContact)
            .filter((contact) => contact !== null)
        : allContacts

      return h.response({
        '@odata.context': odataContext(request, 'contacts(fullname,contactid)'),
        value: contacts.map(({ contactid, fullname }) => ({
          '@odata.etag': 'W/"1000001"',
          contactid,
          fullname
        }))
      })
    } catch (error) {
      request.logger.error(
        structureErrorForECS(error),
        'Failed to return Dynamics contacts stub response'
      )
      throw Boom.internal('Failed to return Dynamics contacts stub response')
    }
  }
}
