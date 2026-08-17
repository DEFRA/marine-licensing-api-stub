// The backend treats anything other than 202 as a failure and retries
const ACCEPTED = 202

/**
 * Builds a controller for one of the Dynamics submission flows. Every flow behaves
 * the same way: accept whatever it is sent, log it, and return 202.
 * @param {string} operation - submit | withdraw | update | marineLicence
 */
export const postSubmissionStubController = (operation) => ({
  options: {
    auth: false,
    payload: {
      parse: true,
      output: 'data'
    }
  },
  handler: async (request, h) => {
    // Real flow URLs carry api-version and sig query params; they are ignored here
    const payload = request.payload ?? {}
    const reference = payload.reference ?? 'unknown'

    request.logger.info(
      {
        event: {
          action: 'dynamics_submission_stub_request',
          category: 'web',
          type: 'access',
          outcome: 'success',
          reference
        }
      },
      `Dynamics ${operation} stub accepted submission for ${reference}`
    )

    return h
      .response({ status: 'accepted', operation, reference })
      .code(ACCEPTED)
  }
})
