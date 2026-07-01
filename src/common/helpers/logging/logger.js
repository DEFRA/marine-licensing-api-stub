import { pino } from 'pino'

import { loggerOptions } from '#/plugins/logger-options.js'

const logger = pino(loggerOptions)

export function createLogger() {
  return logger
}

function extractHttpStatusCode(error) {
  return (
    error.response?.statusCode ||
    error.res?.statusCode ||
    error.statusCode ||
    error.status ||
    error.output?.statusCode
  )
}

function structureErrorForECS(error) {
  if (!error) {
    return {}
  }

  const statusCode = extractHttpStatusCode(error)

  const errorObj = {
    error: {
      message:
        (error && typeof error.message === 'string' && error.message) ||
        String(error),
      stack_trace: error.stack || undefined,
      type: error.name || error.constructor?.name || 'Error',
      code: error.code || error.statusCode || undefined
    }
  }

  if (statusCode) {
    errorObj.http = {
      response: {
        status_code: statusCode
      }
    }
  }

  return errorObj
}

export { structureErrorForECS }
