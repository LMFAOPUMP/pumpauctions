type PricingParams = {
  secondsElapsed: number;
  basePrice: number;
  maxMultiplier: number;
  durationSeconds: number;
  stepSeconds: number;
};

export function getCurrentPrice({
  secondsElapsed,
  basePrice,
  maxMultiplier,
  durationSeconds,
  stepSeconds
}: PricingParams): number {
  const maxPrice = basePrice * maxMultiplier;

  if (secondsElapsed >= durationSeconds) {
    return basePrice;
  }

  const steps = Math.floor(durationSeconds / stepSeconds);
  const decrement = (maxPrice - basePrice) / steps;
  const stepIndex = Math.floor(secondsElapsed / stepSeconds);

  const currentPrice = maxPrice - decrement * stepIndex;
  return Math.max(basePrice, Number(currentPrice.toFixed(6)));
}

export function getCycleProgress(secondsElapsed: number, durationSeconds: number): number {
  return Math.min(secondsElapsed, durationSeconds) / durationSeconds;
}
