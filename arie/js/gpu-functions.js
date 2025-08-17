function rgb2cmyk(red, green, blue) {
  const k = 1 - Math.max(red, Math.max(green, blue));
  const c = (1 - red - k) / (1 - k);
  const m = (1 - green - k) / (1 - k);
  const y = (1 - blue - k) / (1 - k);
  return [c, m, y, k];
}

function cmyk2rgb(cyan, yellow, magenta, black) {
  const r = (1 - cyan) * (1 - black);
  const g = (1 - magenta) * (1 - black);
  const b = (1 - yellow) * (1 - black);
  return [r, g, b];
}

function hsv2rgb(hue, sat, val) {
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let r = 0;
  let g = 0;
  let b = 0;
  if (0 <= hue && hue < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= hue && hue < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= hue && hue < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= hue && hue < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= hue && hue < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  return [r + m, g + m, b + m];
}

function rgb2hsv(red, green, blue) {
  const cmax = Math.max(Math.max(red, green), blue);
  const cmin = Math.min(Math.min(red, green), blue);
  const delta = cmax - cmin;

  let hue = 0;
  if (delta === 0) {
    // hue is 0
  } else if (cmax === red) {
    hue = 60 * (((green - blue) / delta) % 6);
  } else if (cmax === green) {
    hue = 60 * ((blue - red) / delta + 2);
  } else if (cmax === blue) {
    hue = 60 * ((red - green) / delta + 4);
  }

  let sat = 0;
  if (cmax === 0) {
    // sat is 0
  } else {
    sat = delta / cmax;
  }

  const val = cmax;

  return [hue, sat, val];
}

function isSamePixel(pixel1, pixel2) {
  for (let i = 0; i < 3; i++) {
    let a = pixel1[i] * 256,
      b = pixel2[i] * 256;
    if (Math.abs(a - b) > 20) {
      return 0;
    }
  }
  return 1;
}

function getPixel(data, y, x, width) {
  const n = 4 * (x + width * y);
  return [
    data[n] / 256,
    data[n + 1] / 256,
    data[n + 2] / 256,
    data[n + 3] / 256,
  ];
}

function fillByPixel(pixel) {
  this.color(pixel[0], pixel[1], pixel[2]);
}

function isGreen(pixel) {
  let r = pixel[0],
    g = pixel[1],
    b = pixel[2];
  if (
    r >= 0 &&
    r <= 10 / 256 &&
    g >= 0 &&
    g <= 256 / 256 &&
    b >= 0 &&
    b <= 10 / 256
  ) {
    return 1;
  }
  return 0;
}
