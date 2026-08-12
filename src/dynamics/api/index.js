import { postTokenStubController } from './controllers/post-token-stub.js'
import { getContactStubController } from './controllers/get-contact-stub.js'
import { getContactsStubController } from './controllers/get-contacts-stub.js'

// Drop-in replacement paths for the Dynamics 365 contact details integration:
//   DYNAMICS_TOKEN_URL                     -> /dynamics/oauth2/v2.0/token
//   DYNAMICS_API_CONTACT_DETAILS_URL       -> /dynamics/api/data/v9.2/contacts({{contactId}})?$select=fullname
//   DYNAMICS_API_CONTACT_DETAILS_BASE_URL  -> /dynamics/api/data/v9.2
export const dynamics = [
  {
    method: 'POST',
    path: '/dynamics/oauth2/v2.0/token',
    ...postTokenStubController
  },
  {
    method: 'GET',
    path: '/dynamics/api/data/v9.2/contacts({contactId})',
    ...getContactStubController
  },
  {
    method: 'GET',
    path: '/dynamics/api/data/v9.2/contacts',
    ...getContactsStubController
  }
]
