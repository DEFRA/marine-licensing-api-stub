import { getPoliciesStubController } from './controllers/get-policies-stub.js'

// Drop-in replacement path for GOVUK_MARINE_POLICIES_API_URL
// (https://environment.data.gov.uk/explore-marine-plans/api/policies)
export const policies = [
  {
    method: 'GET',
    path: '/explore-marine-plans/api/policies',
    ...getPoliciesStubController
  }
]
