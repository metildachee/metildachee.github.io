// Global variables
var prevData = [];
let currEmptySpots = initArr(1 * 1024, 0);
let oldEmptySpots = initArr(1 * 1024, 0);
let squareX = 100,
  squareY = 100,
  length = 100;
let isDrawSquare = false;

/** 
 * Returns whether collision is considered a top hit
    @param {number} row
    @param {number} start
    @param {number} height
*/
function isTop(row, start, height) {
  let maxTop = start + height;
  let minTop = maxTop - Math.round(height * DIRECTION_PERCENTILE);
  if (row <= maxTop && row >= minTop) {
    return true;
  }
  return false;
}

/** 
 * Returns whether collision is considered a bottom hit
    @param {number} row
    @param {number} start
    @param {number} height
*/
function isBottom(row, start, height) {
  let maxBottom = start + Math.round(height * DIRECTION_PERCENTILE);
  let minBottom = start;
  console.log(
    "[checking bottom], curr movement @",
    row,
    "min",
    minBottom,
    "max",
    maxBottom
  );
  if (row <= maxBottom && row >= minBottom) {
    return true;
  }
  return false;
}

/** 
 * Returns whether collision is considered a left hit
    @param {number} col
    @param {number} start
    @param {number} width
*/
function isLeft(col, start, width) {
  let maxLeft = start + Math.round(width * DIRECTION_PERCENTILE);
  let minLeft = start;
  console.log(
    "[checking left], curr movement @",
    col,
    "min",
    minLeft,
    "max",
    maxLeft
  );
  if (col <= maxLeft && col >= minLeft) {
    return true;
  }
  return false;
}

/** 
 * Returns whether collision is considered a right hit
    @param {number} col
    @param {number} start
    @param {number} width
*/
function isRight(col, start, width) {
  let maxRight = start + width;
  let minRight = start + width - Math.round(width * DIRECTION_PERCENTILE);
  if (col <= maxRight && col >= minRight) {
    return true;
  }
  return false;
}

/** 
 * Returns precise collion force ratio @see IMPACT_FORCE
    @param {number} shapeBeginX 
    @param {number} shapeBeginY
    @param {number} height
    @param {number} width
    @param {number[][]} motionPoints 
*/
function getCollisionForce(
  shapeBeginX,
  shapeBeginY,
  height,
  width,
  motionPoints
) {
  let collision = { l: 0, r: 0, t: 0, b: 0 };
  for (let row = shapeBeginX; row < shapeBeginX + height; row++) {
    for (let col = shapeBeginY; col < shapeBeginY + width; col++) {
      let motion = motionPoints[col][row];
      if (motion != 1) {
        continue;
      }

      if (isTop(row, shapeBeginX, height)) {
        collision.b++; // if we detect collision on the top, we move to the bottom vv
      }

      if (isBottom(row, shapeBeginX, height)) {
        collision.t++;
      }

      if (isLeft(col, shapeBeginY, width)) {
        collision.r++;
      }

      if (isRight(col, shapeBeginY, width)) {
        collision.l++;
      }
    }
  }

  const collisionSort = Object.entries(collision)
    .sort(([, a], [, b]) => b - a)
    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  let directionToMove = Object.keys(collisionSort)[0];

  if (collisionSort[directionToMove] == 0) {
    directionToMove = "s";
  }

  console.log(collisionSort);
  return {
    collisionRate: collisionSort[directionToMove] / (height * width),
    directionToMove: directionToMove,
  };
}

/** 
 * Returns impact ratio @see IMPACT_RATIO
    @param {number} collisionRate
*/
function getImpactRatio(collisionRate) {
  for (const ratio in IMPACT_RATIO) {
    if (collisionRate < ratio) {
      return IMPACT_RATIO[ratio];
    }
  }
}