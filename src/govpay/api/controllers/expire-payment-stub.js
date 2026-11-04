import Boom from '@hapi/boom'
import { getStoredPayment } from '#/govpay/store.js'
import { PAYMENT_OUTCOMES } from '#/govpay/outcomes.js'

export const expirePaymentStubController = {
  options: { auth: false },
  handler: (request, h) => {
    const stored = getStoredPayment(request.params.paymentId)
    if (!stored) {
      throw Boom.notFound('Payment not found')
    }
    if (stored.payment.state.finished) {
      throw Boom.conflict('Payment has already finished')
    }
    stored.payment.state = { ...PAYMENT_OUTCOMES.expire, finished: true }
    stored.nextUrlToken = null
    return h.response(stored.payment.state)
  }
}
