const canvasParent = document.getElementById("canvas-parent");
const pipelineCb = document.getElementById("weird-filter");
const motionDetectionMode = document.getElementById("motiondetection-filter");
const gpuEnabled = document.getElementById("gpu-enabled");
const fpsNumber = document.getElementById("fps-number");
let lastCalledTime = Date.now();
let fps;
let delta;

let dispose = setup();

gpuEnabled.onchange = () => {
  if (dispose) dispose();
  dispose = setup();
};
function setup() {
  let disposed = false;
  const gpu = new GPU({ mode: gpuEnabled.checked ? "gpu" : "cpu" });

  gpu.addFunction(isGreen);
  gpu.addFunction(fillByPixel);
  gpu.addFunction(getPixel);
  gpu.addFunction(isSamePixel);
  gpu.addFunction(rgb2cmyk);
  gpu.addFunction(cmyk2rgb);
  gpu.addFunction(rgb2hsv);
  gpu.addFunction(hsv2rgb);

  function frameToArray(frame) {
    const internalKernel = gpu.createKernel(
      function (frame) {
        const pixel = frame[this.thread.y][this.thread.x];
        this.color(pixel[0], pixel[1], pixel[2], pixel[3]);
      },
      {
        output: [frame.width, frame.height],
        graphical: true,
      }
    );
    internalKernel(frame);
    const result = internalKernel.getPixels(true);
    return result;
  }

  /**
   * Processes CMYK filter
   * @param {number[]} data
   * @param {number} cyanMin
   * @param {number} magMin
   * @param {number} yellowMin
   * @param {number} keyMin
   */

  const cmykKernel = gpu
    .createKernel(function (data, cyanMin, magMin, yellowMin, keyMin) {
      let x = this.thread.x,
        y = this.thread.y;
      const n = 4 * (x + this.constants.w * y);
      let red = data[n] / 256;
      let green = data[n + 1] / 256;
      let blue = data[n + 2] / 256;

      let [cyan, magenta, yellow, black] = rgb2cmyk(red, green, blue);

      cyan = Math.min(cyan * cyanMin, 1);
      magenta = Math.min(magenta * magMin, 1);
      yellow = Math.min(yellow * yellowMin, 1);
      black = Math.min(black * keyMin, 1);

      let [r, g, b] = cmyk2rgb(cyan, yellow, magenta, black);
      this.color(r, g, b, data[n + 3] / 256);
    })
    .setOutput([WIDTH, HEIGHT])
    .setConstants({ w: WIDTH, h: HEIGHT })
    .setGraphical(true)
    .setTactic("precision");

  /**
   * Processes HSV filter
   * @param {number[]} data
   * @param {number} hueRot
   * @param {number} saturationMult
   * @param {number} valueMult
   */

  const hsvKernel = gpu
    .createKernel(function (data, hueRot, saturationMult, valueMult) {
      let x = this.thread.x,
        y = this.thread.y;
      const n = 4 * (x + this.constants.w * y);
      let red = data[n] / 256;
      let green = data[n + 1] / 256;
      let blue = data[n + 2] / 256;

      let [hue, sat, val] = rgb2hsv(red, green, blue);
      hue = (hue + hueRot) % 360;
      sat = sat * saturationMult;
      val = val * valueMult;

      let [hsvRed, hsvGreen, hsvBlue] = hsv2rgb(hue, sat, val);

      this.color(hsvRed, hsvGreen, hsvBlue, data[n + 3] / 256);
    })
    .setOutput([WIDTH, HEIGHT])
    .setConstants({ w: WIDTH, h: HEIGHT })
    .setGraphical(true)
    .setTactic("precision");

  /**
   * Processes convolution filter
   * @param {number[]} data
   * @param {number[]} weights
   * @param {number} radius
   */

  const convolutionKernel = gpu
    .createKernel(function (data, edgeDetection, kernelRadius) {
      const kSize = 2 * kernelRadius + 1;
      let r = 0,
        g = 0,
        b = 0;

      let i = -kernelRadius;
      while (i <= kernelRadius) {
        const x = this.thread.x + i;
        if (x < 0 || x >= this.constants.w) {
          i++;
          continue;
        }

        let j = -kernelRadius;
        while (j <= kernelRadius) {
          const y = this.thread.y + j;
          if (y < 0 || y >= this.constants.h) {
            j++;
            continue;
          }

          const kernelOffset = (j + kernelRadius) * kSize + i + kernelRadius;
          const weights = edgeDetection[kernelOffset];

          const n = 4 * (x + this.constants.w * y);
          r += (data[n] / 256) * weights;
          g += (data[n + 1] / 256) * weights;
          b += (data[n + 2] / 256) * weights;
          j++;
        }
        i++;
      }
      this.color(r, g, b);
    })
    .setOutput([WIDTH, HEIGHT])
    .setConstants({ w: WIDTH, h: HEIGHT })
    .setGraphical(true)
    .setTactic("precision");

  /**
   * Processes motion filter
   * @param {number[]} beforeData
   * @param {number[]} afterData
   */

  const motionDetectionKernel = gpu
    .createKernel(function (beforePixelData, afterPixelData) {
      let y = this.thread.y,
        x = this.thread.x;
      const beforePixel = getPixel(beforePixelData, y, x, this.constants.w);
      const afterPixel = getPixel(afterPixelData, y, x, this.constants.w);

      if (isSamePixel(beforePixel, afterPixel) != 1) {
        this.color(0, 1, 0);
      } else {
        this.color(afterPixel[0], afterPixel[1], afterPixel[2]);
      }
    })
    .setGraphical(true)
    .setConstants({ w: 1024, h: 768 })
    .setOutput([1024, 768]);

  const drawSquare = gpu
    .createKernel(function (frameData, startX, startY, length) {
      let y = this.thread.y,
        x = this.thread.x;
      const pixel = getPixel(frameData, y, x, this.constants.w);

      if (
        x >= startX &&
        x <= startX + length &&
        y >= startY &&
        y < startY + length
      ) {
        this.color(1, 0, 0);
      } else {
        fillByPixel(pixel);
      }
    })
    .setGraphical(true)
    .setConstants({ w: 1024, h: 768 })
    .setOutput([1024, 768]);

  /**
   * Sets square to red and ignores motion
   * @param {number[]} frameData
   * @param {number[]} ignoreData
   * @param {number} startX
   * @param {number} startY
   * @param {number} length
   */

  const drawSquareWithIgnore = gpu
    .createKernel(function (frameData, ignoreData, startX, startY, length) {
      let y = this.thread.y,
        x = this.thread.x;
      const pixel = getPixel(frameData, y, x, this.constants.w);

      if (ignoreData[this.thread.y][this.thread.x] == 1) {
        fillByPixel(pixel);
      } else if (
        x >= startX &&
        x <= startX + length &&
        y >= startY &&
        y < startY + length
      ) {
        this.color(1, 0, 0);
      } else {
        fillByPixel(pixel);
      }
    })
    .setGraphical(true)
    .setConstants({ w: 1024, h: 768 })
    .setOutput([1024, 768]);

  const isMotionKernel = gpu
    .createKernel(function (afterPixelData) {
      let y = this.thread.y,
        x = this.thread.x;
      const afterPixel = getPixel(afterPixelData, y, x, this.constants.w);

      if (isGreen(afterPixel) == 1) {
        return 1;
      }
      return 0;
    })
    .setConstants({ w: 1024, h: 768 })
    .setOutput([1024, 768]);

  canvasParent.appendChild(hsvKernel.canvas);
  const videoElement = document.querySelector("video");
  let oldData = frameToArray(videoElement);
  if (prevData.length == 0) {
    prevData = oldData;
  }

  function render() {
    if (disposed) {
      return;
    }

    let pipelineIdx = getPipelineSequence();
    let array = frameToArray(videoElement);
    if (pipelineCb.checked) {
      for (pIdx of pipelineIdx) {
        if (pIdx == 1 && cmykCb.checked) {
          cmykKernel(
            array,
            parseFloat(cyan.value),
            parseFloat(magenta.value),
            parseFloat(yellow.value),
            parseFloat(key.value)
          );
          array = cmykKernel.getPixels(true);
        } else if (pIdx == 2 && hsvCb.checked) {
          hsvKernel(
            array,
            parseFloat(hue.value),
            parseFloat(saturation.value),
            parseFloat(value.value)
          );
          array = hsvKernel.getPixels(true);
        } else if (pIdx == 3 && conCb.checked) {
          convolutionKernel(
            array,
            EDGE_DETECTION_KERNEL,
            (Math.sqrt(EDGE_DETECTION_KERNEL.length) - 1) / 2
          );
          array = convolutionKernel.getPixels(true);
        } else if (pIdx == 4 && boxCb.checked) {
          convolutionKernel(
            array,
            BOX_BLUR_KERNEL,
            (Math.sqrt(BOX_BLUR_KERNEL.length) - 1) / 2
          );
          array = convolutionKernel.getPixels(true);
        } else if (pIdx == 5 && motionCb.checked) {
          motionDetectionKernel(prevData, array);
          prevData = array;
          array = convolutionKernel.getPixels(true);
        }
      }
    }

    if (motionDetectionMode.checked) {
      canvasParent.addEventListener(
        "click",
        (e) => (
          console.log("[click] x", e.x, "y", e.y),
          (isDrawSquare = true),
          (squareX = e.x),
          (squareY = 1024 - e.y)
        )
      );

      // 1. Capture motion
      motionDetectionKernel(prevData, array);

      // 2. Detect motion
      let motionPoints = isMotionKernel(motionDetectionKernel.getPixels(true));

      // 3. Draw square
      if (isDrawSquare) {
        drawSquareWithIgnore(array, motionPoints, squareX, squareY, length);

        // 4. Get how many pixels have collided into the square
        let { collisionRate, directionToMove } = getCollisionForce(
          squareX,
          squareY,
          length,
          length,
          motionPoints
        );

        // 5. Get travel ratio
        const travelRatio = getImpactRatio(collisionRate);

        // 6. Move square
        let travelDistance = 0;
        if (travelRatio > 0) {
          travelDistance = Math.round(IMPACT_FORCE[travelRatio] * length);

          console.log(
            "direction",
            directionToMove,
            "ratio",
            travelRatio,
            "distance",
            travelDistance
          );

          if (directionToMove == "l" && squareX - travelDistance > 0) {
            squareX -= travelDistance;
          } else if (
            directionToMove == "r" &&
            squareX + length + travelDistance <= width
          ) {
            squareX += travelDistance;
          } else if (
            directionToMove == "t" &&
            squareY + length + travelDistance <= height
          ) {
            squareY = 1024 - (squareY + travelDistance);
          } else if (directionToMove == "b" && squareY + travelDistance > 0) {
            squareY = 1024 - (squareY - travelDistance);
          } else {
            console.log("not moving");
          }
        }
      }

      prevData = array;
    }

    window.requestAnimationFrame(render);
    calcFPS();
  }
  render();
  return () => {
    canvasParent.removeChild(hsvKernel.canvas);
    gpu.destroy();
    disposed = true;
  };
}
