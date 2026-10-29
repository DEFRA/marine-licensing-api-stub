import { randomUUID } from 'node:crypto'

export const MAX_STORED_PAYMENTS = 1000

const payments = new Map()

const generateId = () => randomUUID().replaceAll('-', '').slice(0, 26)

export const savePayment = (payment) => {
  if (
    !payments.has(payment.payment_id) &&
    payments.size >= MAX_STORED_PAYMENTS
  ) {
    payments.delete(payments.keys().next().value)
  }
  payments.set(payment.payment_id, { payment, nextUrlToken: null })
  return payment
}

export const createPaymentId = generateId

export const getStoredPayment = (paymentId) => payments.get(paymentId)

export const issueNextUrlToken = (paymentId) => {
  const stored = payments.get(paymentId)
  stored.nextUrlToken = randomUUID()
  return stored.nextUrlToken
}

export const clearPayments = () => payments.clear()
