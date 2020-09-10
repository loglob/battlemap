"use strict";
// map.common.js: Handles common operations with the map object

const mapFields = {
	size: 1,
	tokens: 2,
	sqrt2: 4,
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
			
			ct.fitText("x", 40, 40);

			/*for (let x = s.start.x - r - 5; x <= s.start.x + r + 5; x++) {
				for (let y = s.start.y - r - 5; y <= s.start.y + r + 5; y++) {
					if(this.containsPoint(s, x, y))
					{
						ct.putText("x", x * cellSize, y * cellSize, cellSize, cellSize);
					}
				}
				
			}*/
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


			/*
			const b = vbounds(s.start, s.end, rtile(a1), rtile(a2))

			
			for (let x = b.min.x - 5; x <= b.max.x + 5; x++) {
				for (let y = b.min.y - 5; y <= b.max.y + 5; y++) {
					if(this.containsPoint(s, x, y))
					{
						ct.putText("x", x * cellSize, y * cellSize, cellSize, cellSize);
					}
				}
				
			}*/
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
			
			/*
			const b = vbounds(s.start, s.end)
			ct.fitText("x", 40, 40);

			for (let x = b.min.x - 5; x <= b.max.x + 5; x++) {
				for (let y = b.min.y - 5; y <= b.max.y + 5; y++) {
					if(this.containsPoint(s, x, y))
					{
						ct.putText("x", x * cellSize, y * cellSize, cellSize, cellSize);
					}
				}
				
			}*/
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
			
			const b = this.bounds(s)
			ct.fitText("x", 40, 40);

			for (let x = Math.floor(b.min.x) - 5; x <= Math.ceil(b.max.x) + 5; x++) {
				for (let y = b.min.y - 5; y <= b.max.y + 5; y++) {
					if(this.containsPoint(s, x, y))
					{
						ct.putText("x", x * cellSize, y * cellSize, cellSize, cellSize);
					}
				}
			}
		}
	},

	// Determines if two shapes are the same
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

function valid(x)
{
	return typeof x != "undefined" && x
}


//#region vector functions

// Maps vector to the list of its components [x,y]
function vx(v)
{
	return [ v.x, v.y ];
}

// normalizes a vector
function norm(v)
{
	const l = Math.sqrt(v.x * v.x + v.y * v.y);

	if(l == 0)
		return v
	else
		return { x: v.x / l, y: v.y / l };
}

// Returns an unit vector that is orthogonal to (x,y) 
function orth(v)
{
	return norm({ x: v.y, y: -v.x })
}

// Maps each components of vector v via f
function vmap(v, f)
{
	return { x: f(v.x), y: f(v.y) }
}

// Multiplies vector v with scalar k
function vmul(v, k)
{
	return { x: v.x * k, y: v.y * k }
}

// Divides vector v by scalar or linearly dependant vector u
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

// Adds vector v and vector or scalar u
function vadd(v, u)
{
	if(typeof u === "number")
		return { x: v.x + u, y: v.y + u };
	else
		return { x: v.x + u.x, y: v.y + u.y }
}

// Calculates inclusive bounds of the any amount of vectors
// : { min { x,y : num }, max { x,y : num } }
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

// calculates v-u
function vsub(v, u)
{
	return { x: v.x - u.x, y: v.y - u.y };
}

// Length of vector v
function vlen(v)
{
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

// (Length of vector v)^2
function vlensq(v)
{
	return v.x * v.x + v.y * v.y;
}

//#endregion

// Turns a color number to a HTML color String
function colorString(color)
{
	return `rgb(${(color & 0xFF0000) >> 16}, ${(color & 0xFF00) >> 8}, ${color & 0xFF})`
}

// Turns a color string of the form #XXXXXX to number
function parseColor(color)
{
	return parseInt(color.substring(1), 16);
}

function cutByResize(tk, left, right, up, down)
{
	return tk.X < -left || tk.Y < -up
		|| tk.X + tk.Width > map.width + right
		|| tk.Y + tk.Height > map.height + down
}

function effectMatches(effect, c,x,y,wr,h)
{
	if(effect.Mask)
		return effect.Mask.x === x && effect.Mask.y === y && effect.Mask.w === wr && effect.Mask.h === h
	else if(effect.Circle)
		return effect.Circle.x === x && effect.Circle.y === y && effect.Circle.r === wr
	else if(effect.h)
		return effect.x === x && effect.y === y && effect.w === wr && effect.h === h
	else
		return effect.x === x && effect.y === y && effect.r === wr
}

/* Determines if (x,y) is in the rectangle defined by (rX,rY) and (rW,rH) */
function within(rX, rY, rW, rH, x, y)
{
	return rX <= x && rX + rW > x && rY <= y && rY + rH > y;
}

function tokenIsAt(tk, x, y)
{
	return within(tk.X, tk.Y, tk.Width, tk.Height, x, y);
}

function tokenIn(tk, x, y, w, h)
{
	const b = ((tk.X < x + w) && (x < tk.X + tk.Width) && (tk.Y < y + h) && (y < tk.Y + tk.Height))
	return b
}

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

function circDist(x, y, cx, cy)
{
	return Math.sqrt(Math.pow(x + 0.5 - cx, 2) + Math.pow(y + 0.5 - cy, 2))
}

function inCircle(tX, tY, x, y, r)
{
	return r*r >= Math.pow(tX + 0.5 - x, 2) + Math.pow(tY + 0.5 - y, 2)
}

function tokenInCircle(tk, x, y, r)
{
	return inCircle(nearest(tk.X, tk.Width, x), nearest(tk.Y, tk.Height, y), x, y, r);
}

function anyTokensInCircle(x, y, r)
{
	for (const tk of map.tokens) {
		if(tokenInCircle(tk, x, y, r))
			return true;
	}

	return false;
}

function tokenAt(x,y)
{
	for (let i = 0; i < map.tokens.length; i++) {
		const e = map.tokens[i];
	
		if(tokenIsAt(e, x, y))
			return e;
	}

	return null;
}

function tokenAtExact(x,y)
{
	for (let i = 0; i < map.tokens.length; i++) {
		const e = map.tokens[i];
	
		if(e.X == x && e.Y == y)
			return e;
	}

	return null;
}

function v(x,y)
{
	return { x:x, y:y }
}

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

function flatName(tk)
{
	return tk.Name.replace("\n", " ")
}

function anyTokensAt(x,y,w,h)
{
	for(let tk of map.tokens)
	{
		if(tokenIn(tk, x, y, w, h))
			return true;
	}

	return false;
}

function wouldCollide(token, x, y)
{
	const coll = tokensAt(x,y, token.Width, token.Height);
	return coll.length > 1 || (coll.length == 1 && coll[0] != token);
}

/* Gets the tile coordinate for the given canvas coordinate
	Also works on a vector.
	Works via flooring the coordinate. */
function tile(coord)
{
	if(typeof coord === "number")
		return Math.floor(coord / cellSize);
	else
		return { x: tile(coord.x), y: tile(coord.y) }
}

/* Gets the tile coordinate for the given canvas coordinate
	Works via rounding the coordinate. */
function rtile(coord)
{
	if(typeof coord === "number")
		return Math.round(coord / cellSize);
	else
		return { x: rtile(coord.x), y: rtile(coord.y) }
}

function outOfBounds(x, y, w = 1, h = 1)
{
	return x < 0 || y < 0 || x + w > map.width || y + h > map.height;
}

/* Distance between two tiles. */
function dist(cX1, cY1, cX2, cY2)
{
	const dX = Math.abs(cX1 - cX2)
	const dY = Math.abs(cY1 - cY2)

	const l = Math.min(dX, dY)
	const h = Math.max(dX, dY)

	const diag = Math.floor((map.sqrt2num * l) / map.sqrt2denom)

	return (h - l + diag) * 5
}

function init()
{
	if(typeof mapInterface !== "undefined" && mapInterface)
		mapInterface.init();
	if(typeof uiInterface !== "undefined" && uiInterface)
		uiInterface.init();
}

function idName(token)
{
	return (token.Name ?? token).split("\n", 2)[0];
}