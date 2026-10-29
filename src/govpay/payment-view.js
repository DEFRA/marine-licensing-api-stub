import { config } from '#/config.js'
import { issueNextUrlToken } from '#/govpay/store.js'

const publicBaseUrl = () => config.get('govPayStub.publicBaseUrl')

const selfLink = (paymentId) => ({
  href: `${publicBaseUrl()}/govpay/v1/payments/${paymentId}`,
  method: 'GET'
})

// Every response for an unfinished payment carries a new next_url, and the previous one
// stops working - real Pay next_urls are single use
export const toPaymentResponse = (payment) => {
  const { payment_id: paymentId } = payment
  const links = { self: selfLink(paymentId) }

  if (!payment.state.finished) {
    const token = issueNextUrlToken(paymentId)
    links.next_url = {
      href: `${publicBaseUrl()}/govpay/pay/${paymentId}/${token}`,
      method: 'GET'
    }
  }

  return { ...payment, _links: links }
}
