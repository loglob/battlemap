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
 * @property {rtxinfo} rtxInfo
 */

/** @typedef {Object} rtxinfo
 * @property {number} globallight The global light level
 * @property {Object.<string,light>} sources The light sources (templates, so no x,y values)
 * @property {number[]} opaque The opaque tiles
 * @property {boolean?} hideHidden Whether or not hidden tokens produce light
 * @property {boolean?} lineOfSight Whether or not players cast line-of-sight
 */

 /**@type {map} */
const map;

const cellSize = 150
const huburl = "/mapHub?token=DEBUG"
const playerToken = null
var w = cellSize * map.Width
var h = cellSize * map.Height
const isDM = true
const imageHint = [ "foobar" ]