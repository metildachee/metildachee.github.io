const HEIGHT = 768;
const WIDTH = 1024;

// Pipeline filters
const FILTER_NAME_TO_ID_MAP = {
  cmyk: 1,
  hsv: 2,
  convolute: 3,
  boxblur: 4,
  motiondetection: 5,
};
const EDGE_DETECTION_KERNEL = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
const BOX_BLUR_KERNEL = [
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
  1 / 9,
];

const NOISE_THRESHOLD = 0.5;
const IMPACT_FORCE = {
  // force level -> distance
  5: 1,
  4: 0.5,
  3: 0.25,
  2: 0.125,
  1: 0.00005,
};
const IMPACT_RATIO = {
  // collision rate -> IMPACT_FORCE
  0.01: 1,
  0.1: 2,
  0.3: 3,
  0.5: 4,
  0.8: 5,
};
const DIRECTION_PERCENTILE = 0.3;
