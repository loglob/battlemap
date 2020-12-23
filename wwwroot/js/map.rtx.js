"use strict";

const lightrange = 5
const tau = Math.PI * 2
const lr2 = lightrange * lightrange

/** A map of all opaque tiles.
 * @typedef {boolean[][]} obstructionMap
*/

/** A reactangle that is compatible with geometric funcitons for tokens
 * @typedef {Object} rect
 * @property {number} X
 * @property {number} Y
 * @property {number} Width
 * @property {number} Height
*/

/** A vector in polar coordinates
 * @typedef {Object} pvec
 * @property {number} x The absolute X coordinate
 * @property {number} y The absolute Y coordinate
 * @property {number} angle The relative angle to the reference point
 * @property {number} len2	The squared distance to the reference point
*/

/** A light source
 * @typedef {Object} light
 * @property {number} x The absolute X coordinate
 * @property {number} y The absolute Y coordinate
 * @property {number} range The range (in tiles) of the light
 * @property {number} level THe lightlevel (as in lightlevel enum)
*/


/** Calculates a polar coordinate point.
 * @param {vec2} p the target point
 * @param {vec2} ref the reference point
 * @returns {pvec} The polar coords for p
 */
function toPolar(p, ref)
{
	const rel = vsub(p, ref)
	return { x:p.x, y:p.y, len2: rel.x*rel.x + rel.y * rel.y, angle: (tau + Math.atan(rel.y / rel.x) + (rel.x < 0) * Math.PI) % tau }
}

/** Determines if a is counter-clockwise from b
 * @param {pvec} a The left point
 * @param {pvec} b The right right
 * @returns {boolean} a is left of b
 */
function leftof(a,b)
{
	return ((tau + b.angle - a.angle) % tau) <= ((tau + a.angle - b.angle) % tau)
}

/** Determines if two line segments intersect and, if so, determines their intersection point.
 * If the lines are paralell, returns the first start or end that is within bot
 *   (prefers starts over ends and [AB] over [CD])
 * @param {vec2} a The first line segment's start
 * @param {vec2} b The first line segment's end
 * @param {vec2} c The second line segment's start
 * @param {vec2} d The second line segment's end
 * @returns {vec2?} The intersection, if it exists
 */
function lineLineIntersect(a,b,c,d)
{
	function isin(p, la, lb)
	{
		const d = vdiv(vsub(p,la), vsub(lb,la))

		return (d >= 0 && d <= 1);
	}

	const div = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)

	if(div == 0)
	{
/*		if(isin(a, c, d))
			return a;
		if(isin(c, a, b))
			return c;
		if(isin(b, c, d))
			return b;
		if(isin(d, a, b))
			return d;*/
		
		return null
	}

	const t = (a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)

	// Point outside |AB|
	if(Math.sign(div) != Math.sign(t) || Math.abs(t) > Math.abs(div))
		return null;

	const u = (a.y - b.y) * (a.x - c.x) - (a.x - b.x) * (a.y - c.y)
	
	// Point outside [CD]
	if(Math.sign(div) != Math.sign(u) || Math.abs(u) > Math.abs(div))
		return null;

	return vadd(a, vmul(vsub(b,a), t / div))
}

/** calculates the intersection of the line from A to B and the circle with radius r and center C
 * The return isn't sorted.
 * @param {vec2} A The origin point
 * @param {vec2} B The other point on the line
 * @param {vec} C The circle center
 * @param {number} r the circle's radius
 * @returns {pvec[]} Both intersecting points
 */
function lineCircleIntersect(A, B, C, r)
{
	A = vsub(A, C)
	B = vsub(B, C)

	const d = vsub(B, A)
	const r2 = vlensq(d)
	const D = A.x * B.y - A.y * B.x
	const root = Math.sqrt(r*r*r2 - D * D)
	const xl = D * d.y
	const xr = ((d.y < 0) ? -1 : 1) * d.x * root
	const yl = -D * d.x
	const yr = Math.abs(d.y) * root

	return [
		{
			x: (xl + xr) / r2,
			y: (yl + yr) / r2,
		},
		{
			x: (xl - xr) / r2,
			y: (yl - yr) / r2,
		}
	].map(u => toPolar(vadd(u, C), C))
}

const lightlevel = {
	dark: 0,
	dim: 1,
	bright: 2,
}

const rtx = {
	/** The source-over canvas used to draw an individual light source's light
	 * @type {CanvasRenderingContext2D}
	 */
	swap : null,
	/** The canvas of swap
	 * @type {HTMLCanvasElement}
	 */
	swapCanvas : null,
	dimLightAlpha : 0.4,
	enableDimLight : true,
	/** Culls rects based on distance from reference
	 * @param {rect[]} r	All rectangles
	 * @param {vec2} ref	The reference point
	 * @param {number} max	The maximum distance
	 * @returns {rect[]}
	 */
	distCull: function(r, ref, max)
	{
		const max2 = max * max
		return r.filter(i => vlensq(vsub({ x: nearest(i.X, i.Width + 1, ref.x), y:nearest(i.Y, i.Height + 1, ref.y)}, ref)) < max2);
	},
	/** Calculates all vertices of the obstructionMap
	 * @returns {obstructionMap} The obstruction map
	 */
	getObsmap: function(opaqueSet)
	{
		return map.colors.map(row => row.map(c => opaqueSet.has(c)))
	},
	/** Calculates the vertices of the rect's shadow.
	 * The returned array is sorted by angle
	* @param {rect} r The opaque rect
	* @param {light} l the light source
	* @returns {pvec[]}
	*/
	shadowVertices: function(r, l)
	{
		/** Finds the replacement point for p if p is outside the light's radius.
		 * Finds the point along the edge p is part of such that it is on the light's boundary and closest to p.
		 * p must be left or right.
		 * @param {pvec} p 
		 * @returns {pvec} A point on the circle that replaces p
		 */
		function replaceOut(p)
		{
			const o = (p != closest) ? closest : (p == left) ? right : left;
			const c = lineCircleIntersect(o, p, l, l.range)
			return vlensq(vsub(c[0], p)) < vlensq(vsub(c[1],p)) ? c[0] : c[1];
		}

		const vert = [v(r.X, r.Y), v(r.X + r.Width, r.Y), v(r.X, r.Y + r.Height), v(r.X + r.Width, r.Y + r.Height)]
			.map(p => toPolar(p, l));
		
		var left = vert[0]
		var right = vert[0]
		var closest = vert[0]

		for (let i = 1; i < 4; i++) {
			const p = vert[i];
			
			if(leftof(p, left))
				left = p;
			else if(leftof(right, p))
				right = p;
			if(p.len2 < closest.len2)
				closest = p;
		}

		const r2 = l.range * l.range

		if(left.len2 > r2)
			left = replaceOut(left);
		if(right.len2 > r2)
			right = replaceOut(right);

		return (closest == left || closest == right) ? [left, right] : [left, closest, right];
	},
	/**
	 * 
	 * @param {boolean[][]} obsmap The obstruction map
	 * @returns {rect[]} An equivalent set of rectangles 
	 */
	toRects: function(obsmap)
	{
		/** Scans the given obstruction map to unify it into rectangles.
		 * Scans along the first axis, then moves one step on the second axis, until the entire map has been scanned.
		 * @param {boolean[][]} M The obstruction map
		 * @param {vex2} p0 The starting point of the scan
		 * @param {vec2} d0 The first axis' unit vector
		 */
		function scanRects(M, p0, d0)
		{
			const width = M.length
			const height = M[0].length
			const d1 = { x: d0.y, y: d0.x }
			let all = []
			let last = []
		
			for (; within(0,0,width,height,p0.x,p0.y); p0 = vadd(p0, d1)) {
				let cur = []
		
				for (let p = p0; within(0,0,width,height,p.x,p.y); p = vadd(p,d0)) {
					if(!M[p.x][p.y])
						continue;
					if(cur.length == 0 || !M[p.x - d0.x][p.y - d0.y])
						cur.push({ X: p.x, Y: p.y, Width: 1, Height: 1 })
					else
					{
						const b = cur[cur.length - 1]
						b.Width += Math.abs(d0.x)
						b.Height += Math.abs(d0.y)
						b.X = min(b.X, p.x)
						b.Y = min(b.Y, p.y)
					}
				}
		
				if(last.length > 0)
				{
					for (let i = cur.length - 1; i >= 0; i--) {
						const c = cur[i]
						const r = { x : c.X - d1.x, y: c.Y - d1.y, w: c.Width * d0.x, h: c.Height * d0.y }
						const j = last.findIndex(s => s.X === r.x && s.Y === r.y && s.Width * d0.x === r.w && s.Height * d0.y === r.h)
						
						if(j >= 0)
						{
							const b = last[j]
							b.Width += Math.abs(d1.x)
							b.Height += Math.abs(d1.y)
							b.X = min(b.X, cur[i].X)
							b.Y = min(b.Y, cur[i].Y)
		
							cur[i] = b
							last.splice(j, 1);
						}
					}
		
					all.push(...last)
				}
		
				last = cur
			}
		
			all.push(...last)
		
			return all
		}
		
		/*  */
		const allw = [
			/* left to right */
			scanRects(obsmap, v(0,0), v(1,0)),
			/* up to down */
			scanRects(obsmap, v(0,0), v(0,1)),
			/* right to left */
			scanRects(obsmap, v(obsmap.length - 1, obsmap[0].length - 1), v(-1,0)),
			/* down to up */
			scanRects(obsmap, v(obsmap.length - 1, obsmap[0].length - 1), v(0,-1)),
		]

		let sel = allw[0]

		for (let i = 1; i < allw.length; i++) {
			if(allw[i].length < sel.length)
				sel = allw[i]
		}

		return sel
	},
	/** Renders a single light source onto the swap canvas.
	 * Does not fill shapes, just populates the canvas path
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {light} l
	 * @param {rect[]} R 
	 */
	drawLight: function(ctx, l, R)
	{
		/** Projects a point onto the edge of the light circle
		 * @param {vec2} p A point
		 * @returns {pvec} Its projection
		 */
		function project(p)
		{
			const _p = vadd(vmul(vsub(p, l), l.range / Math.sqrt(p.len2)), l)
			return { x:_p.x, y:_p.y, angle: p.angle, len2: l.range * l.range, len: l.range }
		}
		/** Determines if two shadow edges overlap.
		 * Reflexive.
		 * @param {pvec[]} a One shadow edge
		 * @param {pvec[]} b Another shadow edge
		 * @returns {boolean} a and b overlap
		 */
		function overlap(a,b)
		{
			function edges(s)
			{
				if(leftof(s[0], s[s.length - 1]))
					return { l: s[0], r: s[s.length - 1] }
				else
					return { l: s[s.length - 1], r: s[0] }
			}

			const ae = edges(a)
			const be = edges(b)

			return (leftof(ae.l, be.l) && leftof(be.l, ae.r)) || (leftof(be.l, ae.l) && leftof(ae.l, be.r));
		}
		/** Merges two overlapping shadow edges.
		 * @param {pvec[]} a A shadow edge
		 * @param {pvec[]} b Another shadow edge
		 * @returns {pvec[]} Marged vertices of a and b 
		 */
		function merge(a,b)
		{
			/** A 2D line
			 * @typedef {Object} line
			 * @property {pvec} s The start of the line
			 * @property {pvec} e The end of the line
			 */

			/** Determines every line of a shadow edge.
			 * The returned array is indexed by end point index.
			 * It includes the projected lines at [0] and [|s|]
			 * @param {pvec[]} s The shadow edge
			 * @returns {line[]} Its lines
			 */
			function lines(s)
			{
				let l = [ { s: project(s[0]), e: s[0] } ]

				for (let i = 1; i < s.length; i++) {
					l.push({ s: s[i-1], e: s[i] })
				}

				l.push({ s: s[s.length - 1], e: project(s[s.length - 1]) })
				return l;
			}
			/** Determines the leftmost intersection of the given line with the given edge
			 * @param {line} l A line
			 * @param {line[]} o A vertex edge
			 * @param {number} sans Skips the given index
			 * @param {line} sans Ignores intersects with the given line
			 * @returns {{ i: number, l: line, p: vec2 }?} The intersecting point and line
			 */
			function intersection(l, o, sans)
			{
				for (let i = 0; i < o.length; i++) {
					if(i == sans)
						continue;

					const p = lineLineIntersect(l.s, l.e, o[i].s, o[i].e)

					if(p)
						return { i:i, l: o[i], p: p }
				}

				return null
			}

			const la = lines(a);
			const lb = lines(b);
			let m = []
			
			let curEdge = leftof(a[0], b[0]) ? a : b;
			let cur = project(curEdge[0])
			let next = curEdge[0]
			// index of _next_ end point
			let curI = 0
			let lastLine = -1

			for(;;)
			{
				const li = (curEdge == a) ? lb : la
				const i = intersection({ s: cur, e: next }, li, lastLine);

				if(i && i.p.angle !== cur.angle)
				{
					cur = toPolar(i.p, l)
					next = i.l.e
					lastLine = curI + 1
					curI = i.i
					curEdge = (curEdge == a) ? b : a;
				}
				else
				{
					cur = next
					curI++

					if(curI > curEdge.length)
					{
						//m.push(cur);
						break;
					}

					next = curI < curEdge.length ? curEdge[curI] : project(curEdge[curEdge.length - 1])
					lastLine = -1
				}
			
				// don't push duplicate points
				if(m.length == 0 || cur.x != m[m.length - 1].x || cur.y != m[m.length - 1].y)
					m.push(cur);
			}

			return m
		}
		function ccv(p)
		{
			return cc(...vx(p))
		}

		let S = this.distCull(R, l, l.range)
			.map(r => this.shadowVertices(r, l))


		let mergedAny;

		do
		{
			mergedAny = false;

			for (let i = 0; i < S.length; i++) {
				for (let j = i+1; j < S.length; j++) {
					if(overlap(S[i], S[j]))
					{
						S[i] = merge(S[i], S[j]);
						S.splice(j,1);
						mergedAny = true;
						break;
					}
				}

				if(mergedAny)
					break;
			}
		} while(mergedAny);

		let lastAngle = null;
		let firstAngle;
		const lc = cc(l.x, l.y, l.range)

		for (const s of S.sort((a,b) => a[0].angle - b[0].angle))
		{
			if(lastAngle === null)
			{
				ctx.moveTo(...ccv(s[0]))
				firstAngle = s[0].angle;
			}
			else
				ctx.arc(...lc, lastAngle, s[0].angle)
			
			for (const p of s)
				ctx.lineTo(...ccv(p))

			const end = s[s.length - 1]
			ctx.lineTo(...ccv(project(end)))
			lastAngle = end.angle;
		}

		if(lastAngle == null)
			ctx.arc(...lc, 0, 2 * Math.PI);
		else
			ctx.arc(...lc, lastAngle, firstAngle)
	},
	/** Finds the player's darkvision light source
	 * @returns {light[]} Either a 1-element array or an empty array
	 */
	getPlayerLight: function()
	{
		const p = uiInterface?.player
		const dv = cookie?.data?.character?.darkvision

		if(p)
			return { x: p.X + p.Width / 2, y: p.Y + p.Height / 2, range: dv, level: lightlevel.dim }
		else
			return null
	},
	/**
	 * @param {Object.<string,light>} lightDict Maps token idnames to light templates 
	 * @returns {light[]} All light sources
	 */
	getLights: function(lightDict, hideHidden)
	{
		return map.tokens
			.map(tk => [ tk, lightDict[idName(tk)] ])
			.filter(e => (typeof(e[1]) !== "undefined") && (!hideHidden || !e[0].Hidden))
			.flatMap(e => {
				/**
				 * @type {token}
				 */
				const tk = e[0]
				/**
				 * @type {light}
				 */
				const l = e[1]
				const x = tk.X + tk.Width / 2
				const y = tk.Y + tk.Height / 2

				if(l.level == lightlevel.bright)
					return [ { x:x, y:y, range: l.range, level: lightlevel.bright },
						{ x:x, y:y, range: l.range * 2, level: lightlevel.dim } ]
				else
					return [ { x:x, y:y, range: l.range, level: l.level } ]
			})
	},
	/** Renders the shadow layer
	 * @param {CanvasRenderingContext2D} ctx 
	 * @param {rect[]} R	All hitboxes
	 * @param {light[]} L	All light sources
	 * @param {light?} P	The player's pseudo-lightsource
	 */
	draw: function(ctx, R, L, P)
	{
		if(map.rtxInfo.globallight == lightlevel.bright)
		{
			ctx.clear();
			return;
		}

		ctx.save();

		if(map.rtxInfo.globallight < lightlevel.dim)
		{
			// draw darkness, except around a player with darkvision
			ctx.globalCompositeOperation = "copy"

			if(P?.range)
			{
				ctx.beginPath()
				this.drawLight(ctx, P, R)

				ctx.globalAlpha = this.dimLightAlpha
				ctx.fill()
				ctx.globalCompositeOperation = "destination-over"
				ctx.globalAlpha = 1.0

				ctx.rect(w, 0, -w, h);
				ctx.fill();
			}
			else
				ctx.fillRect(0, 0, w, h)
			
			ctx.globalCompositeOperation = "destination-out"
			ctx.beginPath()

			// erase all illuminated areas
			for (const l of L.filter(l => l.level == lightlevel.dim)) {
				this.drawLight(ctx, l, R)
			}

			ctx.fill();
		}

		ctx.globalCompositeOperation = "destination-over"
		ctx.globalAlpha = this.dimLightAlpha;

		// fill in dim light color, except around a player with darkvision
		if(P?.range)
		{
			ctx.beginPath()
			this.drawLight(ctx, P, R)
			ctx.rect(w, 0, -w, h);
			ctx.fill();
		}
		else
			ctx.fillRect(0, 0, w, h)
		
		ctx.globalCompositeOperation = "destination-out"
		ctx.globalAlpha = 1.0;
		ctx.beginPath()

		// erase all areas in bright light
		for (const l of L.filter(l => l.level == lightlevel.bright)) {
			this.drawLight(ctx, l, R)
		}

		ctx.fill();

		if(P && map.rtxInfo.lineOfSight)
		{
			ctx.globalCompositeOperation = "source-over"
			const maxR = max(max(vlensq(P),
					vlensq(vsub(P, v(0, map.height)))),
				max(vlensq(vsub(P, v(map.width, 0))),
					vlensq(vsub(P, v(map.width, map.height)))))
			
			ctx.beginPath();
			this.drawLight(ctx, { x: P.x, y: P.y, range: Math.ceil(Math.sqrt(maxR)) }, R);
			ctx.rect(w, 0, -w, h);
			ctx.fill();
		}

		ctx.restore()
	}
};

const rtxInterface = {
	cache: { },
	oldCache: "",
	enabled: !isDM,
	init : function()
	{
		if(this.initialized)
			return;

		rtx.swapCanvas = document.createElement("canvas")
		rtx.swapCanvas.width = w
		rtx.swapCanvas.height = h
		rtx.swap = rtx.swapCanvas.getContext("2d")
		rtx.swap.fillRect(0,0,w,h)
		layers.shadow.canvas.style.filter = "blur(10px)"
		this.onMapUpdate(mapFields.rtxInfo)

		this.initialized = true
	},
	/**
	 * @param {CanvasRenderingContext2D} ctx 
	 */
	draw: function(ctx)
	{
		if(!this.initialized)
			this.init()
		if(!this.enabled)
		{
			ctx.clear();
			return;
		}

		rtx.draw(ctx, this.cache.R, this.cache.L, this.cache.P)
	},
	onMapUpdate: function(fields)
	{
		if((fields & (mapFields.size | mapFields.colors | mapFields.tokens | mapFields.rtxInfo)) == 0)
			return;

		if(fields & mapFields.size)
		{
			rtx.swap.canvas.width = w
			rtx.swap.canvas.height = h
			rtx.swap.fillRect(0,0,w,h)
		}
		if(fields & mapFields.rtxInfo)
			this.cache.opaqueSet = new Set(map.rtxInfo.opaque)
		if(fields & (mapFields.colors | mapFields.size | mapFields.rtxInfo))
			this.cache.R = rtx.toRects(rtx.getObsmap(this.cache.opaqueSet))
		if(fields & (mapFields.tokens | mapFields.size | mapFields.rtxInfo))
		{
			this.cache.L = rtx.getLights(map.rtxInfo.sources, map.rtxInfo.hideHidden ?? false)
			this.cache.P = rtx.getPlayerLight();
		}

		const newcache = JSON.stringify(this.cache)
		
		// Avoid expensive redraw
		if(!(fields & mapFields.size | mapFields.rtxInfo) && newcache === this.oldCache)
			return;

		this.oldCache = newcache;
		if(this.initialized)
			layers.shadow.draw()
	}
}

function debugctx() {
	/**
	 * @type {CanvasRenderingContext2D}
	 */
	const ctx = layers.shadow.context

	ctx.canvas.style.filter = ""
	ctx.fillStyle = "orange"
	ctx.strokeStyle = "red"
	ctx.lineWidth = 9
	ctx.globalAlpha = 0.4

	return ctx
}