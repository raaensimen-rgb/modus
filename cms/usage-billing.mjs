// PL-056. Pure, side-effect-free billing decision logic; no Stripe charges here.
// Activity is aggregated by a trusted server from idempotent, approved events.
export const THRESHOLD_BASIS_POINTS=6000;
export function calculatePeriodDecision({eligibleUnits,periodTargetUnits,planAmountOre,periodId}){
 if(!Number.isSafeInteger(eligibleUnits)||eligibleUnits<0)throw new TypeError('Invalid eligible units');
 if(!Number.isSafeInteger(periodTargetUnits)||periodTargetUnits<=0)throw new TypeError('Invalid period target');
 if(!Number.isSafeInteger(planAmountOre)||planAmountOre<0)throw new TypeError('Invalid plan amount');
 if(typeof periodId!=='string'||!/^[-a-zA-Z0-9_:]{3,100}$/.test(periodId))throw new TypeError('Invalid period identifier');
 const minimumUnits=Math.ceil(periodTargetUnits*THRESHOLD_BASIS_POINTS/10000);
 const qualified=eligibleUnits>=minimumUnits;
 return Object.freeze({
  periodId,eligibleUnits,periodTargetUnits,minimumUnits,
  qualified,chargeOre:qualified?planAmountOre:0,
  usagePercent:Math.min(100,Math.floor(eligibleUnits/periodTargetUnits*100)),
  chargeAuthorization:false
 });
}
