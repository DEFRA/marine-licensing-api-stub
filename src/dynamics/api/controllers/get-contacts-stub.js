import {
  allContacts,
  odataContext,
  resolveContact
} from '#/dynamics/helpers/resolve-contact.js'

const NOT_FOUND = 404
const ETAG = 'W/"1000001"'

const CONTACT_ID_CLAUSE = /contactid eq '([^']*)'/gi

const contactIdsFromFilter = (filter) =>
  [...filter.matchAll(CONTACT_ID_CLAUSE)].map(([, contactId]) => contactId)

const singleContactResponse = (request, h, contactId) => {
  const contact = resolveContact(contactId)

  if (!contact) {
    return h
      .response({
        error: {
          code: '0x80040217',
          message: `contact With Id = ${contactId} Does Not Exist`
        }
      })
      .code(NOT_FOUND)
  }

  // $select is ignored - the backend only reads fullname and extra fields are harmless
  return h.response({
    '@odata.context': odataContext(request, 'contacts(fullname)/$entity'),
    '@odata.etag': ETAG,
    ...contact
  })
}

const contactCollectionResponse = (request, h) => {
  const filter = request.query.$filter

  // Ids that are not GUIDs resolve to null and are dropped; real Dynamics would
  // reject the whole query with a 400
  const contacts = filter
    ? contactIdsFromFilter(filter)
        .map(resolveContact)
        .filter((contact) => contact !== null)
    : allContacts

  return h.response({
    '@odata.context': odataContext(request, 'contacts(fullname,contactid)'),
    value: contacts.map(({ contactid, fullname }) => ({
      '@odata.etag': ETAG,
      contactid,
      fullname
    }))
  })
}

// Serves both contact routes: `contacts({contactId})` returns a single entity or a
// Dynamics shaped 404, `contacts` returns the `$filter`ed collection
export const getContactsStubController = {
  options: {
    auth: false
  },
  handler: async (request, h) => {
    const { contactId } = request.params

    request.logger.info(
      {
        event: {
          action: contactId
            ? 'dynamics_contact_stub_request'
            : 'dynamics_contacts_stub_request',
          category: 'web',
          type: 'access'
        },
        url: {
          path: request.path,
          query: request.query
        }
      },
      contactId
        ? `Dynamics contact stub request received for ID ${contactId}`
        : 'Dynamics contacts stub request received'
    )

    return contactId
      ? singleContactResponse(request, h, contactId)
      : contactCollectionResponse(request, h)
  }
}
