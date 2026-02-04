export function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

export function twoProportionZTest(successA, nA, successB, nB) {
  if (nA === 0 || nB === 0) {
    return { zScore: 0, pValue: 1, isSignificant: false };
  }

  const pA = successA / nA;
  const pB = successB / nB;
  const pPooled = (successA + successB) / (nA + nB);

  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / nA + 1 / nB));

  if (se === 0) {
    return { zScore: 0, pValue: 1, isSignificant: false };
  }

  const zScore = (pA - pB) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  return {
    zScore: parseFloat(zScore.toFixed(4)),
    pValue: parseFloat(pValue.toFixed(6)),
    isSignificant: pValue < 0.05
  };
}

export function confidenceInterval(successA, nA, successB, nB) {
  if (nA === 0 || nB === 0) {
    return { low: 0, high: 0 };
  }

  const pA = successA / nA;
  const pB = successB / nB;
  const diff = pA - pB;
  const se = Math.sqrt((pA * (1 - pA)) / nA + (pB * (1 - pB)) / nB);

  const z = 1.96;
  return {
    low: parseFloat((diff - z * se).toFixed(6)),
    high: parseFloat((diff + z * se).toFixed(6))
  };
}

export function relativeLift(valueA, valueB) {
  if (valueB === 0) return 0;
  return parseFloat((((valueA - valueB) / valueB) * 100).toFixed(2));
}

export function determineWinner(rateA, rateB, pValue) {
  if (pValue >= 0.05) return 'none';
  return rateA > rateB ? 'A' : 'B';
}

export function isSampleAdequate(nA, nB, minSample = 100) {
  return nA >= minSample && nB >= minSample;
}

export function runAnalysis(successA, nA, successB, nB) {
  const rateA = nA > 0 ? (successA / nA) * 100 : 0;
  const rateB = nB > 0 ? (successB / nB) * 100 : 0;

  const { zScore, pValue, isSignificant } = twoProportionZTest(successA, nA, successB, nB);
  const ci = confidenceInterval(successA, nA, successB, nB);
  const lift = relativeLift(rateA, rateB);
  const winner = determineWinner(rateA, rateB, pValue);
  const adequate = isSampleAdequate(nA, nB);

  return {
    rateA: parseFloat(rateA.toFixed(2)),
    rateB: parseFloat(rateB.toFixed(2)),
    zScore,
    pValue,
    isSignificant,
    confidenceInterval: ci,
    relativeLift: lift,
    winner,
    sampleAdequate: adequate
  };
}