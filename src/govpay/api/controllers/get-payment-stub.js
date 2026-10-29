import Boom from '@hapi/boom'
import { getStoredPayment } from '#/govpay/store.js'
import { toPaymentResponse } from '#/govpay/payment-view.js'
import { requireBearerToken } from './require-bearer-token.js'

export const getPaymentStubController = {
  options: {
    auth: false,
    pre: [{ method: requireBearerToken }]
  },
  handler: (request, h) => {
    const stored = getStoredPayment(request.params.paymentId)
    if (!stored) {
      throw Boom.notFound('Payment not found')
    }
    return h.response(toPaymentResponse(stored.payment))
  }
}
