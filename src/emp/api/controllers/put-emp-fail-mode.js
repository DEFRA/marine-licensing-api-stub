import Boom from '@hapi/boom'
import {
  FAIL_MODES,
  empStubFailMode,
  setEmpStubFailMode
} from '../fail-mode.js'

export const putEmpFailModeController = {
  options: {
    auth: false,
    payload: {
      parse: true,
      output: 'data'
    }
  },
  handler: async (request, h) => {
    const requested = request.payload?.mode
    const mode = setEmpStubFailMode(requested)

    if (!mode) {
      throw Boom.badRequest(
        `mode must be one of: ${Object.values(FAIL_MODES).join(', ')}`
      )
    }

    request.logger.info(
      {
        event: {
          action: 'emp_stub_fail_mode_changed',
          category: 'configuration',
          type: 'change',
          outcome: 'success'
        }
      },
      `EMP stub fail mode set to ${mode}`
    )

    return h.response({ mode: empStubFailMode() })
  }
}

export const getEmpFailModeController = {
  options: { auth: false },
  handler: async (_request, h) => h.response({ mode: empStubFailMode() })
}
