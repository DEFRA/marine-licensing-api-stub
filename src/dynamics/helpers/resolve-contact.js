import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const contacts = require('../data/contacts.json')

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// `userid` is the defra-id stub login ID, kept only so a lookup by either ID
// resolves the same person - it is never part of a response
const toContactEntity = ({ userid: _userid, ...contact }) => contact

const contactsById = new Map(
  contacts.map((contact) => [contact.contactid.toLowerCase(), contact])
)

const contactsByUserId = new Map(
  contacts
    .filter((contact) => contact.userid)
    .map((contact) => [contact.userid.toLowerCase(), contact])
)

const isValidGuid = (contactId) =>
  typeof contactId === 'string' && GUID_PATTERN.test(contactId)

// Named after the GUID rather than after a plausible person, so it is obvious this
// contact is a placeholder and not one of the seeded defra-id users
const generateContact = (contactId) => {
  const suffix = contactId.slice(0, contactId.indexOf('-'))

  return {
    contactid: contactId,
    fullname: `Test User ${suffix}`,
    firstname: 'Test',
    lastname: `User ${suffix}`,
    emailaddress1: `test.user.${suffix}@example.com`
  }
}

/**
 * Resolve a contact GUID to a stub contact entity.
 * Known GUIDs come from the fixture - either a defra-id registration's contactId
 * (what the backend actually looks up) or its userId. Any other valid GUID gets a
 * deterministic generated contact so locally seeded data always resolves to a name.
 * @param {string} contactId
 * @returns {object|null} contact entity, or null if the id is not a GUID
 */
export const resolveContact = (contactId) => {
  if (!isValidGuid(contactId)) {
    return null
  }

  const key = contactId.toLowerCase()
  const contact = contactsById.get(key) ?? contactsByUserId.get(key)

  if (!contact) {
    return generateContact(contactId)
  }

  // Echo back the id that was asked for - callers match responses on contactid
  return { ...toContactEntity(contact), contactid: contactId }
}

export const allContacts = contacts.map(toContactEntity)

export const odataContext = (request, suffix) =>
  `${request.url.origin}/dynamics/api/data/v9.2/$metadata#${suffix}`
