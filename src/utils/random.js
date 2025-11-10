/**
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 *
 * @param {Number} xp
 * @returns {Number}
 */
function calcLevel(xp) {
  let level = 0;
  while (xp >= getTotalXpForLevel(level + 1)) {
    level++;
  }
  return level;
}

/**
 *
 * @param {number} level
 * @returns {number}
 */
function getTotalXpForLevel(level) {
  return (5 / 3) * level ** 3 + 25 * level ** 2 + 100 * level;
}

export { getRandomInt, getTotalXpForLevel, calcLevel, getTotalXpForLevel };
