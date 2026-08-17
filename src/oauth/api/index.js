import { postTokenStubController } from './controllers/post-token-stub.js'

// Drop-in replacement path for MARINE_LICENSING_ADDRESS_LOOKUP_OAUTH_TOKEN_URL
// (https://login.microsoftonline.com/<tenantId>/oauth2/v2.0/token). The tenant-prefixed
// path is accepted too so the local URL can mirror the real one exactly.
//
// Dynamics points at the same controller from src/dynamics/api/index.js.
export const oauth = [
  {
    method: 'POST',
    path: '/oauth2/v2.0/token',
    ...postTokenStubController
  },
  {
    method: 'POST',
    path: '/{tenantId}/oauth2/v2.0/token',
    ...postTokenStubController
  }
]
