const MAX_SUBMISSIONS = 50

// Module-level, so submissions survive between requests but not restarts -
// this is a local development aid, not a store
const submissions = []

export const recordSubmission = ({ operation, reference, payload }) => {
  submissions.push({
    receivedAt: new Date().toISOString(),
    operation,
    reference,
    payload
  })

  if (submissions.length > MAX_SUBMISSIONS) {
    submissions.shift()
  }
}

/**
 * @returns {object[]} the recorded submissions, newest first
 */
export const getSubmissions = () => [...submissions].reverse()
