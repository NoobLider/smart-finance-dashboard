import { ANOMALY_METHOD, ANOMALY_MIN_SAMPLE_SIZE } from "./constants/detection";

const IQR_MULTIPLIER = 1.5;

export type AnomalyMethod = typeof ANOMALY_METHOD;

export interface AmountSample {
  amount: number;
}

export interface AnomalyDetectionResult<T extends AmountSample> {
  method: AnomalyMethod;
  sampleSize: number;
  minSampleSize: number;
  skipped: boolean;
  reason?: string;
  q1?: number;
  q3?: number;
  iqr?: number;
  lowerBound?: number;
  upperBound?: number;
  anomalies: T[];
}

function quantile(sortedValues: number[], percentile: number): number {
  const index = (sortedValues.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export function detectIqrAnomalies<T extends AmountSample>(
  samples: T[],
): AnomalyDetectionResult<T> {
  if (samples.length < ANOMALY_MIN_SAMPLE_SIZE) {
    return {
      method: ANOMALY_METHOD,
      sampleSize: samples.length,
      minSampleSize: ANOMALY_MIN_SAMPLE_SIZE,
      skipped: true,
      reason: "insufficient_sample_size",
      anomalies: [],
    };
  }

  const amounts = samples.map((sample) => sample.amount).sort((a, b) => a - b);

  const q1 = quantile(amounts, 0.25);
  const q3 = quantile(amounts, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - IQR_MULTIPLIER * iqr;
  const upperBound = q3 + IQR_MULTIPLIER * iqr;

  const anomalies = samples.filter(
    (sample) => sample.amount < lowerBound || sample.amount > upperBound,
  );

  return {
    method: ANOMALY_METHOD,
    sampleSize: samples.length,
    minSampleSize: ANOMALY_MIN_SAMPLE_SIZE,
    skipped: false,
    q1,
    q3,
    iqr,
    lowerBound,
    upperBound,
    anomalies,
  };
}
