import Joi from 'joi'
import { getStoredPayment } from '#/govpay/store.js'
import { PAYMENT_OUTCOMES } from '#/govpay/outcomes.js'

const PENCE_PER_POUND = 100

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const OUTCOME_BUTTONS = [
  ['pay', 'Pay (success)'],
  ['decline', 'Decline card (P0010)'],
  ['expire', 'Let it expire (P0020)'],
  ['cancel', 'Cancel payment (P0030)'],
  ['error', 'Provider error (P0050)']
]

const renderPage = (
  { payment_id: paymentId, amount, reference, description },
  token
) => {
  const buttons = OUTCOME_BUTTONS.map(
    ([outcome, label]) =>
      `<button type="submit" name="outcome" value="${outcome}">${label}</button>`
  ).join('\n      ')

  return `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>GOV.UK Pay stub</title></head>
  <body>
    <h1>GOV.UK Pay stub</h1>
    <p>This page stands in for the GOV.UK Pay card details page. Choose an outcome.</p>
    <dl>
      <dt>Reference</dt><dd>${escapeHtml(reference)}</dd>
      <dt>Description</dt><dd>${escapeHtml(description)}</dd>
      <dt>Amount</dt><dd>&pound;${(amount / PENCE_PER_POUND).toFixed(2)}</dd>
    </dl>
    <form method="post" action="/govpay/pay/${escapeHtml(paymentId)}/${escapeHtml(token)}">
      ${buttons}
    </form>
  </body>
</html>`
}

const expiredLinkPage = `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8"><title>GOV.UK Pay stub</title></head>
  <body>
    <h1>This payment link is no longer valid</h1>
    <p>Payment links can only be used once. Go back to the service and try again.</p>
  </body>
</html>`

const NOT_FOUND = 404

const findPaymentForToken = (paymentId, token) => {
  const stored = getStoredPayment(paymentId)
  if (
    !stored ||
    stored.payment.state.finished ||
    stored.nextUrlToken !== token
  ) {
    return null
  }
  return stored
}

export const getHostedPaymentPageStubController = {
  options: { auth: false },
  handler: (request, h) => {
    const { paymentId, token } = request.params
    const stored = findPaymentForToken(paymentId, token)
    if (!stored) {
      return h.response(expiredLinkPage).type('text/html').code(NOT_FOUND)
    }
    stored.payment.state = { status: 'started', finished: false }
    return h.response(renderPage(stored.payment, token)).type('text/html')
  }
}

export const postHostedPaymentPageStubController = {
  options: {
    auth: false,
    payload: {
      parse: true,
      output: 'data',
      allow: ['application/x-www-form-urlencoded', 'application/json']
    },
    validate: {
      payload: Joi.object({
        outcome: Joi.string()
          .valid(...Object.keys(PAYMENT_OUTCOMES))
          .required()
      })
    }
  },
  handler: (request, h) => {
    const { paymentId, token } = request.params
    const stored = findPaymentForToken(paymentId, token)
    if (!stored) {
      return h.response(expiredLinkPage).type('text/html').code(NOT_FOUND)
    }

    stored.nextUrlToken = null
    const { outcome } = request.payload
    stored.payment.state = { ...PAYMENT_OUTCOMES[outcome], finished: true }

    request.logger.info(
      {
        event: {
          action: 'govpay_stub_payment_completed',
          outcome: 'success'
        }
      },
      `GOV.UK Pay stub set payment ${paymentId} to ${stored.payment.state.status}`
    )

    return h.redirect(stored.payment.return_url)
  }
}
