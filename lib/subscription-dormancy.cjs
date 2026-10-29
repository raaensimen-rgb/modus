'use strict';
// MODUS Dvale – deterministic, provider-agnostic policy decisions.
// This module NEVER collects payment, grants entitlements, or updates Stripe.
// Call it only with authenticated server-side events and an authoritative clock.
const INACTIVE_DAYS = 30;
const INACTIVE_MS = INACTIVE_DAYS * 24 * 60 * 60 * 1000;
function timestamp(value, name) {
  const ms = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ms)) throw new TypeError(name + ' must be a valid timestamp');
  return ms;
}
function snapshot({now, lastActivityAt, paidThrough, cancelRequestedAt = null}) {
  const current = timestamp(now, 'now');
  const last = timestamp(lastActivityAt, 'lastActivityAt');
  const end = timestamp(paidThrough, 'paidThrough');
  if (last > current) throw new RangeError('Last activity cannot be in the future');
  const canceled = cancelRequestedAt !== null;
  if (canceled && timestamp(cancelRequestedAt, 'cancelRequestedAt') > current) {
    throw new RangeError('Cancellation cannot be in the future');
  }
  const inactive = current - last >= INACTIVE_MS;
  const accessUntilPaid = current < end;
  const phase = canceled ? 'cancellation_requested'
    : inactive ? 'dormant'
    : accessUntilPaid ? 'active' : 'period_expired';
  return Object.freeze({
    phase, inactive, daysWithoutActivity: Math.floor((current - last) / 86400000),
    hasPrepaidAccess: accessUntilPaid,
    // Dvale/cancellation must suppress the next billing attempt, not erase paid access.
    permitAutomaticRenewal: !canceled && !inactive && accessUntilPaid
  });
}
function renewalDecision({renewalAt, lastActivityAt, cancelRequestedAt = null, paidThrough}) {
  // Evaluate at the EXACT renewal instant, using server activity committed before renewal.
  const moment = timestamp(renewalAt, 'renewalAt');
  const paidEnd = timestamp(paidThrough, 'paidThrough');
  if (moment !== paidEnd) throw new RangeError('Renewal must match the current paid-period boundary');
  const result = snapshot({now: moment, lastActivityAt, paidThrough, cancelRequestedAt});
  return Object.freeze({
    action: result.inactive ? 'stop_no_charge_dormant'
      : cancelRequestedAt !== null ? 'stop_no_charge_canceled'
      : 'eligible_for_provider_renewal',
    shouldCharge: !result.inactive && cancelRequestedAt === null
  });
}
function reactivationDecision({now, lastActivityAt, paidThrough, cancelRequestedAt = null}) {
  const state = snapshot({now, lastActivityAt, paidThrough, cancelRequestedAt});
  return Object.freeze({
    action: state.hasPrepaidAccess ? 'restore_prepaid_access_without_charge'
      : 'new_checkout_required',
    chargeNow: !state.hasPrepaidAccess,
    // Always require affirmative action to resume recurring billing.
    requiresRenewalConsent: true,
    providerSetsNewPeriod: !state.hasPrepaidAccess
  });
}
module.exports = {INACTIVE_DAYS, snapshot, renewalDecision, reactivationDecision};
