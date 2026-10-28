/** Human-readable labels must not turn an attempt into completed cancellation. */
export function factLabel(key: string): string {
  const labels: Record<string,string> = {
    company:'Company', plan:'Plan or service', price:'Recorded price', signupDate:'Signup date',
    billingDates:'Billing dates', cancellationAttempts:'Cancellation attempts',
    chargesAfterCancellation:'Charges reported after a cancellation request', currency:'Currency',
    disputeSummary:'Your concern', companyPosition:'Company explanation',
  };
  return labels[key] ?? key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
}
