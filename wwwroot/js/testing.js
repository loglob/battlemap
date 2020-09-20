// testing.js: Testing data for proper type recognition in the IDE

/** @typedef {Object} map
 * @property {string} id
 * @property {number} width
 * @property {number} height
 * @property {number[][]} colors
 * @property {token[]} tokens
 * @property {settings} settings
 * @property {effect[]} effects
 * @property {?shape} spawn
 * @property {Object.<string,string>} sprites
 */

 /**@type {map} */
const map;

const cellSize = 150
const huburl = "/mapHub?token=DEBUG"
var w = cellSize * map.Width
var h = cellSize * map.Height
const isDM = true
const imageHint = [ "foobar" ]