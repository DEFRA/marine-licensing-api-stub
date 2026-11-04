/**
 * Lets a tester force EMP pushes to fail, so the caller's retry and dead-letter
 * path can be exercised without pointing at an unreachable host - which fails
 * with a connection error rather than the API-level failure the caller actually
 * handles differently.
 *
 * Starts from EMP_STUB_FAIL_MODE and can be changed at runtime, because
 * switching between a successful transition and a failing one otherwise means
 * restarting the container mid-test.
 *
 * In-memory and deliberately not persisted: a restart returns to the configured
 * default rather than leaving a stub mysteriously broken.
 */
export const FAIL_MODES = {
  NONE: 'none',
  ADD: 'add',
  UPDATE: 'update',
  ALL: 'all'
}

const isValidMode = (mode) => Object.values(FAIL_MODES).includes(mode)

let currentMode = isValidMode(process.env.EMP_STUB_FAIL_MODE)
  ? process.env.EMP_STUB_FAIL_MODE
  : FAIL_MODES.NONE

export const empStubFailMode = () => currentMode

export const setEmpStubFailMode = (mode) => {
  if (!isValidMode(mode)) {
    return null
  }

  currentMode = mode
  return currentMode
}
