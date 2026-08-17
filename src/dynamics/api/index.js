import { postTokenStubController } from '#/oauth/api/controllers/post-token-stub.js'
import { getContactsStubController } from './controllers/get-contacts-stub.js'
import { postSubmissionStubController } from './controllers/post-submission-stub.js'

// Drop-in replacement paths for the Dynamics 365 integrations:
//   DYNAMICS_TOKEN_URL                     -> /dynamics/oauth2/v2.0/token
//   DYNAMICS_API_CONTACT_DETAILS_URL       -> /dynamics/api/data/v9.2/contacts({{contactId}})?$select=fullname
//   DYNAMICS_API_CONTACT_DETAILS_BASE_URL  -> /dynamics/api/data/v9.2
//   DYNAMICS_API_URL                       -> /dynamics/flows   (base - the backend appends /exemptions)
//   DYNAMICS_API_WITHDRAW_URL              -> /dynamics/flows/exemptions/withdraw
//   DYNAMICS_API_UPDATE_EXEMPTION_URL      -> /dynamics/flows/exemptions/update
//   DYNAMICS_MARINE_LICENCE_API_URL        -> /dynamics/flows/marine-licences
export const dynamics = [
  {
    // Shared with the address lookup token stub — see src/oauth/api/index.js
    method: 'POST',
    path: '/dynamics/oauth2/v2.0/token',
    ...postTokenStubController
  },
  {
    method: 'GET',
    path: '/dynamics/api/data/v9.2/contacts({contactId})',
    ...getContactsStubController
  },
  {
    method: 'GET',
    path: '/dynamics/api/data/v9.2/contacts',
    ...getContactsStubController
  },
  {
    method: 'POST',
    path: '/dynamics/flows/exemptions',
    ...postSubmissionStubController('submit')
  },
  {
    method: 'POST',
    path: '/dynamics/flows/exemptions/withdraw',
    ...postSubmissionStubController('withdraw')
  },
  {
    method: 'POST',
    path: '/dynamics/flows/exemptions/update',
    ...postSubmissionStubController('update')
  },
  {
    method: 'POST',
    path: '/dynamics/flows/marine-licences',
    ...postSubmissionStubController('marineLicence')
  }
]
