import Joi from 'joi'
import { createPaymentId, savePayment } from '#/govpay/store.js'
import { toPaymentResponse } from '#/govpay/payment-view.js'
import { requireBearerToken } from './require-bearer-token.js'

const CREATED = 201

const createPaymentSchema = Joi.object({
  amount: Joi.number().integer().min(1).max(10000000).required(),
  reference: Joi.string().max(255).required(),
  description: Joi.string().max(255).required(),
  return_url: Joi.string().uri().max(2000).required(),
  language: Joi.string().valid('en', 'cy'),
  email: Joi.string().email(),
  delayed_capture: Joi.boolean(),
  metadata: Joi.object()
    .max(15)
    .pattern(
      Joi.string().max(30),
      Joi.alternatives(Joi.string().max(100), Joi.number(), Joi.boolean())
    )
}).unknown(true)

export const postPaymentStubController = {
  options: {
    auth: false,
    pre: [{ method: requireBearerToken }],
    payload: { parse: true, output: 'data' },
    validate: { payload: createPaymentSchema }
  },
  handler: (request, h) => {
    const { payload } = request

    const payment = savePayment({
      amount: payload.amount,
      description: payload.description,
      reference: payload.reference,
      language: payload.language ?? 'en',
      metadata: payload.metadata,
      email: payload.email,
      return_url: payload.return_url,
      payment_id: createPaymentId(),
      payment_provider: 'sandbox',
      created_date: new Date().toISOString(),
      state: { status: 'created', finished: false }
    })

    request.logger.info(
      {
        event: {
          action: 'govpay_stub_payment_created',
          outcome: 'success'
        }
      },
      `GOV.UK Pay stub created payment ${payment.payment_id} for ${payment.reference}`
    )

    return h.response(toPaymentResponse(payment)).code(CREATED)
  }
}
