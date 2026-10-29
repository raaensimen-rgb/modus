/* Public configuration only: Stripe Payment Links contain no secret keys.
   Keep salesOpen false until payments, access control and terms are verified. */
window.MODUS_MEMBERSHIP_CONFIG = {
  salesOpen: false,
  customerPortal: '',
  termsUrl: '',
  privacyUrl: '',
  supportEmail: '',
  plans: {
    elev: {
      name: 'Modus Elev', monthly: 39, yearly: 390,
      contentReady: false, accessReady: false,
      checkout: { month: '', year: '' }
    },
    plus: {
      name: 'Modus+', monthly: 79, yearly: 790,
      contentReady: false, accessReady: false,
      checkout: { month: '', year: '' }
    },
    studio: {
      name: 'Modus Studio', monthly: 129, yearly: 1290,
      contentReady: false, accessReady: false,
      checkout: { month: '', year: '' }
    }
  }
};
