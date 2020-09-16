"use strict";
// map.common.js: Handles common operations with the map object

window.onerror = console.error

/** @typedef {Object} token
 * @property {number} X
 * @property {Number} Y
 * @property {Number} Width
 * @property {Number} Height
 * @property {boolean} Hidden
 * @property {string} Name
*/

const mapFields = {
	size: 1,
	tokens: 2,
	settings: 4,
	colors: 8,
	effects: 16,
	spawn: 32,
	sprites: 64,
	all: 127
};

//#region Array Extension methods

/* Removes every item in the array that matches the predicate */
Array.prototype.removeAll = function(matches) {
	let i = this.length
	let c = 0

	while(i--)
	{
		if(matches(this[i]))
		{
			this.splice(i, 1);
			c++
		}
	}

	return c
}

/* Removes the given item in-place. Returns whether or not the item was found. */
Array.prototype.remove = function(item) {
	let i = this.length
	
	while(i--)
	{
		if(this[i] === item)
		{
			this.splice(i, 1);
			return true;
		}
	}

	return false;
}
//#endregion

const shape = {
	circle: {
		vertexCentered: true,
		radius: function(s) {
			return Math.floor(Math.sqrt(Math.pow(s.start.x - s.end.x, 2) + Math.pow(s.start.y - s.end.y, 2)))
		},
		containsPoint: function(s, x, y) {
			const r = this.radius(s)
			return r*r >= Math.pow(x + 0.5 - s.start.x, 2) + Math.pow(y + 0.5 - s.start.y, 2)
		},
		containsToken: function(s, tk) {
//			console.log("r: ", this.radius(s))
			return this.containsPoint(s, nearest(tk.X, tk.Width, s.start.x), nearest(tk.Y, tk.Height, s.start.y))
		},
		draw: function(s, ct) {
			const r = this.radius(s)
			ct.arc(s.start.x * cellSize, s.start.y * cellSize, r * cellSize, 0, 2 * Math.PI);
		},
		equal: function(a, b) {
			return this.radius(a) == this.radius(b)
		}
	},
	cone: {
		containsPoint: function(s, x, y) {
			x += 0.5
			y += 0.5

			const a1 = vadd(s.start, 0.5);
			
			const end = vadd(s.end, 0.5);
			const v = vsub(a1, end);

			if(v.x == 0 && v.y == 0)
				return false

			const ov = vmul(orth(v), vlen(v) / 2);

			const a2 = vadd(end, ov)
			const a3 = vsub(end, ov)


			const d = ((a2.y - a3.y)*(a1.x - a3.x) + (a3.x - a2.x)*(a1.y - a3.y))
			var a = ((a2.y - a3.y)*(x - a3.x) + (a3.x - a2.x)*(y - a3.y)) / d
			var b = ((a3.y - a1.y)*(x - a3.x) + (a1.x - a3.x)*(y - a3.y)) / d
			var c = 1 - a - b;

			return 0 <= a && a <= 1 && 0 <= b && b <= 1 && 0 <= c && c <= 1;
		},
		draw: function(s, ct) {
			const origin = vmul(vadd(s.start, 0.5), cellSize);

			ct.moveTo(origin.x, origin.y)
			
			const end = vmul(vadd(s.end, 0.5), cellSize);
			const v = vsub(origin, end);
			const ov = vmul(orth(v), vlen(v) / 2);
			const a1 = vadd(end, ov)
			const a2 = vsub(end, ov)
	
			ct.lineTo(a1.x, a1.y)
			ct.lineTo(a2.x, a2.y)
			ct.lineTo(origin.x, origin.y);
		},
	},
	mask: {
		getRect: function (s) {
			return {	
					r: Math.max(s.start.x, s.end.x), 
					l: Math.min(s.start.x, s.end.x),
					t: Math.max(s.start.y, s.end.y),
					b: Math.min(s.start.y, s.end.y) }
		},
		containsPoint: function(s, x, y) {
			const r = this.getRect(s)
			return x >= r.l && x <= r.r && y >= r.b && y <= r.t;
		},
		containsToken: function(s, tk) {
			const r = this.getRect(s)
			return (tk.X <= r.r) && (r.l < tk.X + tk.Width) && (tk.Y <= r.t) && (r.b < tk.Y + tk.Height)
		},
		draw: function(s, ct) {
			const r = this.getRect(s)
			const rr = r.r + 1
			const rt = r.t + 1

			ct.moveTo(r.l * cellSize, rt * cellSize)
			ct.lineTo(r.l * cellSize, r.b * cellSize)
			ct.lineTo(rr * cellSize, r.b * cellSize)
			ct.lineTo(rr * cellSize, rt * cellSize)
			ct.lineTo(r.l * cellSize, rt * cellSize)
		},
		empty: function() {
			return false;
		}
	},
	line: {
		containsPoint: function(s, x, y) {
			if(s.start.x === s.end.x && s.start.y === s.end.y)
				return false;

			x += 0.5;
			y += 0.5;
			const p = vadd(s.start, 0.5)
			const q = vadd(s.end, 0.5)
			const v = vsub(s.end, s.start);
			const vl = vlen(v);
			
			const d = (v.y * x - v.x * y + q.x * p.y - q.y * p.x) / vl;

			if(d > 0.5 || d < -0.5)
				return false;

			//const b = vsub({ x: x, y:y}, vmul(orth(v), d))
			//const l = vdiv(vsub(b, p), v)
			const l = vdiv(vsub(vsub({ x: x, y:y}, vmul(orth(v), d)), p), v)

			return l > 0 && l <= 1;

			//const l = vsub({ x: x, y:y}, vmul(orth(v), d))
		},
		bounds: function(s) {
			return vbounds(s.start, s.end);
		},
		draw: function(s, ct) {
			const o = vmul(orth(vsub(s.end, s.start)), 0.5 * cellSize)
			const end = vmul(vadd(s.end, 0.5), cellSize)
			const start = vmul(vadd(s.start, 0.5), cellSize)
			
			ct.moveTo(...vx(vadd(start, o)))
			ct.lineTo(...vx(vsub(start, o)))
			ct.lineTo(...vx(vsub(end, o)))
			ct.lineTo(...vx(vadd(end, o)))
			ct.lineTo(...vx(vadd(start, o)))
		}
	},
	cube: {
		getPoints: function(s) {
			const v = vsub(s.end, s.start);
			const o = vmul(orth(v), 0.5 * vlen(v))
			const end = vadd(s.end, 0.5)
			const start = vadd(s.start, 0.5)

			return [ vadd(start, o), vsub(start, o), vsub(end, o), vadd(end, o) ]
		},
		bounds: function(s) {
			let p = this.getPoints(s)
			return vbounds(...p.map(v => vmap(v, Math.floor)), ...p.map(v => vmap(v, Math.ceil)))
		},
		containsPoint: function(s, x, y) {
			if(s.start.x === s.end.x && s.start.y === s.end.y)
				return false;

			x += 0.5;
			y += 0.5;
			const p = vadd(s.start, 0.5)
			const q = vadd(s.end, 0.5)
			const v = vsub(s.end, s.start);
			const vl = vlen(v)
			
			const d = (v.y * x - v.x * y + q.x * p.y - q.y * p.x) / (vl * vl);

			if(d > 0.5 || d < -0.5)
				return false;

			const l = vdiv(vsub(vsub({ x: x, y:y}, vmul(orth(v), d * vl)), p), v)
			
			return l >= 0 && l <= 1
		},
		draw: function(s, ct) {
			const p = this.getPoints(s).map(v => vx(vmul(v, cellSize)))
			
			ct.moveTo(...p[3])
			
			for (const i of p)
				ct.lineTo(...i);
		}
	},

	/** Determines if two shapes are the same */
	equal: function(a, b) {
		const k = a.kind.toLowerCase()
		return k === b.kind.toLowerCase()
			&& a.start.x === b.start.x
			&& a.start.y === b.start.y
			&& (shape[k].equal
				? shape[k].equal(a, b)
				: (a.end.x === b.end.x && a.end.y === b.end.y))
	},
	draw: function(s, ct) {
		shape[s.kind.toLowerCase()].draw(s, ct);
	},
	containsPoint: function(s, x, y) {
		return shape[s.kind.toLowerCase()].containsPoint(s, x, y);
	},
	containsToken: function(s, tk) {
		const k = s.kind.toLowerCase()
		var sh = shape[k]

		if(sh.containsToken)
			return sh.containsToken(s, tk);

		if(sh.bounds)
		{
			const b = sh.bounds(s);

			if(tk.X + tk.Width <= b.min.x || tk.X > b.max.x || tk.Y + tk.Height <= b.min.y || tk.Y > b.max.y)
				return false;
		}

		for (let x = tk.X; x < tk.X + tk.Width; x++)
		{
			for (let y = tk.Y; y < tk.Y + tk.Height; y++)
			{
				if(sh.containsPoint(s, x, y))
					return true;
			}
		}

		return false
	},
	new: function(kind, start, end) {
		return { kind: kind, start: start, end: end }
	},
	from: function(k, sx, sy, ex, ey) {
		return this.new(k, { x: sx, y: sy }, { x: ex, y: ey })
	},
	expand: function(s) {
		return [ s.kind, s.start.x, s.start.y, s.end.x, s.end.y ];
	},
	empty: function(s) {
		const sh = shape[s.kind.toLowerCase()];

		if(sh.empty)
			return sh.empty(s);

		return s.start.x === s.end.x && s.start.y === s.end.y;
	}
}

//#region vector functions
/** @typedef {{ x: number, y: number }} vec2 */

/** Constructs a generic vector
 * @returns {{ x:any, y:any }}
 */
function v(x,y)
{
	return { x:x, y:y }
}

/** Maps a generic vector to the list of its components [x,y]
 * @param {{ x:any, y:any }} v - The vector
 * @returns {any[]} Its components
*/
function vx(v)
{
	return [ v.x, v.y ];
}

/** Normalizes a vector
 * @param {vec2} v - The vector
 * @returns {vec2} Its normalized form
*/
function norm(v)
{
	const l = Math.sqrt(v.x * v.x + v.y * v.y);

	if(l == 0)
		return v
	else
		return { x: v.x / l, y: v.y / l };
}

/** Finds an orthogonal vector
 * @param {vec2} v - The vector
 * @returns {vec2} A unit vector that is orthogonal to v
*/
function orth(v)
{
	return norm({ x: v.y, y: -v.x })
}

/** Maps each component of v via f
 * @param {vec2} v - The vector
 * @param {function} f - A number->number function
 * @returns {vec2} 
*/
function vmap(v, f)
{
	return { x: f(v.x), y: f(v.y) }
}

/** Multiplies vector v with scalar k
 * @param {vec2} v - The vector
 * @param {number} f - The scalar
 * @returns {vec2} 
*/
function vmul(v, k)
{
	return { x: v.x * k, y: v.y * k }
}

/** Divides vector v by scalar or linearly dependant vector u
 * @param {vec2} v - The divident
 * @param {(vec2|number)} u - The divisor
 * @returns {number} Their quotient
*/
function vdiv(v, u)
{
	if(typeof u === "number")
		return { x: v.x / u, y: v.y / u }
	else
	{
		let lx = v.x / u.x
		let ly = v.y / u.y

		if(u.x === 0 && v.x === 0)
			return ly ?? 0;
		if(u.y === 0 && v.y === 0)
			return lx;
			
		return lx;
	}
}

/** Adds vector v and vector or scalar u
 * @param {vec2} v - A vector
 * @param {(vec2|number)} u - A vector or scalar
 * @returns {vec2} Their sum
 */
function vadd(v, u)
{
	if(typeof u === "number")
		return { x: v.x + u, y: v.y + u };
	else
		return { x: v.x + u.x, y: v.y + u.y }
}

/** Calculates inclusive bounds of any amount of vectors
 * @param {vec2} v - A vector
 * @param {...vec2} other - The other vectors
 * @returns {{min: vec2, max: vec2}} */
function vbounds(v, ...other)
{
	let xmin = v.x
	let xmax = v.x
	let ymin = v.y
	let ymax = v.y

	for (const i of other) {
		if(i.x < xmin)
			xmin = i.x
		else if(i.x > xmax)
			xmax = i.x
		if(i.y < ymin)
			ymin = i.y
		else if(i.y > ymax)
			ymax = i.y
	}

	return { min: { x:xmin, y:ymin }, max: { x:xmax, y:ymax } }
}

/** Calculates v - u
 * @param {vec2} v - A vector
 * @param {vec2} u - A vector
 * @returns {vec2} Their difference
 */
function vsub(v, u)
{
	return { x: v.x - u.x, y: v.y - u.y };
}

/** Calculates the length of vector v
 * @param {{ x: number, y:number }} v - A vector
 * @returns {number} its length
 */
function vlen(v)
{
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Calculates the squared length of vector v
 * @param {{ x: number, y:number }} v - A vector
 * @returns {number} its length^2
 */
function vlensq(v)
{
	return v.x * v.x + v.y * v.y;
}

//#endregion

/** Compares two objects a and b memberwise recursively. Also works for atomic types.
 * @returns {boolean}
 */
function compareObj(a,b)
{
	if(typeof a !== typeof b)
		return false;
	if(typeof a !== "object")
		return a === b;

	let keys = []

	for (const key in a) {
		if (a.hasOwnProperty(key)) {
			if(!compareObj(a[key], b[key]))
				return false;

			keys.push(key);
		}
	}

	keys = new Set(keys);

	for (const key in b) {
		if (b.hasOwnProperty(key) && !keys.has(key))
			return false;
	}

	return true;
}

/** Turns a color number into a HTML color string
 * @param {number} color - A rgb color code as a number
 * @returns {string} A color string of the form rgb(...)
 */
function colorString(color)
{
	return `rgb(${(color & 0xFF0000) >> 16}, ${(color & 0xFF00) >> 8}, ${color & 0xFF})`
}

/** Turns a color string of the form #XXXXXX into a number
 * @param {string} color - A hex color code
 * @returns {number}
 */
function parseColor(color)
{
	return parseInt(color.substring(1), 16);
}

/** Determines if tk is cut by the given resize operation
 * @param {token} tk		The token
 * @param {number} left		The left side change
 * @param {number} right	The right side change
 * @param {number} up		The upper side change
 * @param {number} down		The lower side change
 * @returns {boolean}
 */
function cutByResize(tk, left, right, up, down)
{
	return tk.X < -left || tk.Y < -up
		|| tk.X + tk.Width > map.width + right
		|| tk.Y + tk.Height > map.height + down
}

/** Determines if a point is within a rectangle
 * @param {number} rX	The rectangle's x
 * @param {number} rY	The rectangle's y
 * @param {number} rW	The rectangle's width
 * @param {number} rH	The rectangle's height
 * @param {number} x	The point's x
 * @param {number} y	The point's y
 * @returns {boolean}
*/
function within(rX, rY, rW, rH, x, y)
{
	return rX <= x && rX + rW > x && rY <= y && rY + rH > y;
}

/** Determines if a token intersects a point
 * @param {token} tk	The token
 * @param {number} x	The point's x
 * @param {number} y	The point's y
 * @returns {boolean}
 */
function tokenIsAt(tk, x, y)
{
	return within(tk.X, tk.Y, tk.Width, tk.Height, x, y);
}

/** Determines if a token intercets a rectangle
 * @param {token} tk	The token
 * @param {number} x	The rectangle's x
 * @param {number} y	The rectangle's y
 * @param {number} w	The rectangle's width
 * @param {number} h	The rectangle's height
 * @returns {boolean}
 */
function tokenIn(tk, x, y, w, h)
{
	return ((tk.X < x + w) && (x < tk.X + tk.Width) && (tk.Y < y + h) && (y < tk.Y + tk.Height))
}


/** Finds the value within a range closest to a target
 * @param {number} start	The range's start (inclusive)
 * @param {number} len		The range's length
 * @param {number} target	The target value
 * @returns {number}
 */
function nearest(start, len, target)
{
	if(target <= start)
		return start
	
	const end = start + len - 1

	if(target >= end)
		return end
	else
		return target
}

/** Determines if a point is within a circle
 * @param {number} tX	The point's x
 * @param {number} tY	The point's y
 * @param {number} x	The circle's x
 * @param {number} y	The circle's y
 * @param {number} r	The circle's radius
 * @returns {boolean}
 */
function inCircle(tX, tY, x, y, r)
{
	return r*r >= Math.pow(tX + 0.5 - x, 2) + Math.pow(tY + 0.5 - y, 2)
}

/** Determines if a token intersects a circle
 * @param {token} tk	The token
 * @param {number} x	The circle's x
 * @param {number} y	The circle's y
 * @param {number} r	The circle's radius
 * @returns {boolean}
 */
function tokenInCircle(tk, x, y, r)
{
	return inCircle(nearest(tk.X, tk.Width, x), nearest(tk.Y, tk.Height, y), x, y, r);
}

/** Finds the token that occupies a point, or null, if there is none.
 * @param {number} x	The point's x
 * @param {number} y	The point's y
 * @returns {?token} 
*/
function tokenAt(x,y)
{
	for (let i = 0; i < map.tokens.length; i++) {
		const e = map.tokens[i];
	
		if(tokenIsAt(e, x, y))
			return e;
	}

	return null;
}

/** Finds the token that has its origin at a point, or null, if there is none.
 * @param {number} x	The point's x
 * @param {number} y	The point's y
 * @returns {?token} 
*/
function tokenAtExact(x,y)
{
	for (let i = 0; i < map.tokens.length; i++) {
		const e = map.tokens[i];
	
		if(e.X == x && e.Y == y)
			return e;
	}

	return null;
}

/** Finds all tokens intersecting a rectangle.
 * @param {number} x	The rectangle's x
 * @param {number} y	The rectangle's y
 * @param {number} w	The rectangle's width
 * @param {number} h	The rectangle's height
 * @returns {token[]} */
function tokensAt(x,y,w,h)
{
	var arr = []

	for(let tk of map.tokens)
	{
		if(tokenIn(tk, x, y, w, h))
			arr.push(tk)
	}

	return arr;
}

/** Makes the token's name printable, in case it has a number
 * @param {token} tk	The token
 * @returns {string}
 */
function flatName(tk)
{
	return tk.Name.replace("\n", " ")
}

/** Determines a token's identifying name, removing its number
 * @param {token} token	The token
 * @returns {string}
 */
function idName(token)
{
	return (token.Name ?? token).split("\n", 2)[0];
}

/** Determines if there are any tokens in a rectangle.
 * @param {number} x	The rectangle's x
 * @param {number} y	The rectangle's y
 * @param {number} w	The rectangle's width
 * @param {number} h	The rectangle's height
 * @returns {boolean} */
function anyTokensAt(x,y,w,h)
{
	for(let tk of map.tokens)
	{
		if(tokenIn(tk, x, y, w, h))
			return true;
	}

	return false;
}

/** Determines if a token would collide with existing tokens when placed at a point
 * @param {token} tk	The token
 * @param {number} x	The points's x
 * @param {number} y	The points's y
 * @returns {boolean}
*/
function wouldCollide(token, x, y)
{
	const coll = tokensAt(x,y, token.Width, token.Height);
	return coll.length > 1 || (coll.length == 1 && coll[0] != token);
}

/** Gets the tile coordinate for the given scalar or vector of canvas coordinates.
 * Floors its result, rather than rounding.
 * @param {vec2|number} coord	The canvas coordinate(s)
 * @returns {vec2|number}	The tile coordinate(s)
 */
function tile(coord)
{
	if(typeof coord === "number")
		return Math.floor(coord / cellSize);
	else
		return { x: tile(coord.x), y: tile(coord.y) }
}

/** Gets the tile coordinate for the given scalar or vector of canvas coordinates.
 * Rounds its result, rather than flooring.
 * @param {vec2|number} coord	The canvas coordinate(s)
 * @returns {vec2|number}	The tile coordinate(s)
 */
function rtile(coord)
{
	if(typeof coord === "number")
		return Math.round(coord / cellSize);
	else
		return { x: rtile(coord.x), y: rtile(coord.y) }
}

/** Determines if the given point or rectangle is out of bounds
 * @param {number} x	The rectangle or point's x
 * @param {number} y	The rectangle or point's y
 * @param {number} [w=1]	The rectangle's width
 * @param {number} [h=1]	The rectangle's height
 * @returns {boolean}
 */
function outOfBounds(x, y, w = 1, h = 1)
{
	return x < 0 || y < 0 || x + w > map.width || y + h > map.height;
}

/** Determines the distance between two tiles.
 * Uses the sqrt(2) approximation from map.settings
 * @param {number} cX1	The first point's x
 * @param {number} cY1	The first point's y
 * @param {number} cX2	The second point's x
 * @param {number} cY2	The second point's y
 * @returns {number}
 */
function dist(cX1, cY1, cX2, cY2)
{
	const dX = Math.abs(cX1 - cX2)
	const dY = Math.abs(cY1 - cY2)

	const l = Math.min(dX, dY)
	const h = Math.max(dX, dY)

	const diag = Math.floor((map.settings.Sqrt2Numerator * l) / map.settings.Sqrt2Denominator)

	return (h - l + diag) * 5
}


/** Performs initialization for all map components
 * @returns {void}
 */
function init()
{
	if(typeof cookie !== "undefined" && cookie)
		cookie.load();
	if(typeof mapInterface !== "undefined" && mapInterface)
		mapInterface.init();
	if(typeof uiInterface !== "undefined" && uiInterface)
		uiInterface.init();
}
