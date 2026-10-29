export const PAYMENT_OUTCOMES = {
  pay: { status: 'success' },
  decline: {
    status: 'failed',
    code: 'P0010',
    message: 'Payment method rejected'
  },
  expire: { status: 'failed', code: 'P0020', message: 'Payment expired' },
  cancel: {
    status: 'failed',
    code: 'P0030',
    message: 'Payment was cancelled by the user'
  },
  error: {
    status: 'error',
    code: 'P0050',
    message: 'Payment provider returned an error'
  }
}
