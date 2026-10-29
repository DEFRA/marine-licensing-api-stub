import { postPaymentStubController } from './controllers/post-payment-stub.js'
import { getPaymentStubController } from './controllers/get-payment-stub.js'
import { expirePaymentStubController } from './controllers/expire-payment-stub.js'
import {
  getHostedPaymentPageStubController,
  postHostedPaymentPageStubController
} from './controllers/hosted-payment-page-stub.js'

// GOVPAY_API_URL -> /govpay   (the backend appends /v1/payments)
export const govPay = [
  {
    method: 'POST',
    path: '/govpay/v1/payments',
    ...postPaymentStubController
  },
  {
    method: 'GET',
    path: '/govpay/v1/payments/{paymentId}',
    ...getPaymentStubController
  },
  {
    method: 'GET',
    path: '/govpay/pay/{paymentId}/{token}',
    ...getHostedPaymentPageStubController
  },
  {
    method: 'POST',
    path: '/govpay/pay/{paymentId}/{token}',
    ...postHostedPaymentPageStubController
  },
  {
    method: 'POST',
    path: '/govpay/test/payments/{paymentId}/expire',
    ...expirePaymentStubController
  }
]
