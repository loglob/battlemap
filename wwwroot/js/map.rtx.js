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

function derect(R, w, h)
{
	let m = new Array(w);

	for (let i = 0; i < w; i++) {
		m[i] = new Array(h).fill(0)
	}

	for (const r of R) {
		for (let x = r.X; x < r.X + r.Width; x++) {
			for (let y = r.Y; y < r.Y + r.Height; y++) {	
				m[x][y] = 1
			}
		}
	}

	return m
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
		function project(p)
		{
			const _p = vadd(vmul(vsub(p, l), l.range / Math.sqrt(p.len2)), l)
			return { x:_p.x, y:_p.y, angle: p.angle, len2: l.range * l.range, len: l.range }
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
		const lout = left.len2 > r2
		const rout = right.len2 > r2

		if(lout)
			left = replaceOut(left);
		if(rout)
			right = replaceOut(right);

		return [
			// project left if it wasn't moved
			...(lout ? [] : [project(left)]),
			left,
			// include closest point if it is distinct from left and right
			...((closest == left || closest == right) ? [] : [closest]),
			right,
			// project right if it wasn't moved
			...(rout ? [] : [project(right)])]
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
	/** Draws the shadow of a rectangle.
	 * Does NOT fill/stroke it, only mutates path
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {pvec[]} s The rects's shadowVertices
	 * @param {light} L The light circle's data
	 */
	drawShadow: function(ctx, s, L)
	{
		ctx.moveTo(...vx(vmul(s[0], cellSize)))

		for (let i = 1; i < s.length; i++)
			ctx.lineTo(...vx(vmul(s[i], cellSize)))

		ctx.arc(...cc(L.x, L.y, L.range), s[s.length-1].angle, s[0].angle, true)
	},
	/** Renders a single light source onto the swap canvas
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {light} L 
	 * @param {rect[]} R 
	 */
	drawLight: function(ctx, L, R)
	{
		let S = this.distCull(R, L, L.range)
			.map(r => this.shadowVertices(r, L))
			// sort by starting angle to allow primitive vertex culling
			.sort((a,b) => a[0].angle - b[0].angle)

		let lastStartAngle = NaN
		let lastEndAngle = NaN

		ctx.beginPath();

		for (const s of S) {
			// said primitive vertex culling
			if(s[0].angle >= lastStartAngle && s[s.length - 1].angle <= lastEndAngle)
				continue;

			this.drawShadow(ctx, s, L)
			
			lastStartAngle = s[0].angle
			lastStartAngle = s[s.length - 1].angle
		}

		ctx.fill()
		ctx.stroke()
	},
	/** Renders a single light source onto the shadow canvas using the swap canvas.
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {light} L 
	 * @param {rect[]} R 
	 */
	putLight: function(ctx, L, R)
	{
		const b = cc(L.x - L.range, L.y - L.range, L.range * 2, L.range * 2)

		// cut out a transparent circle from the swap canvas
		this.swap.globalCompositeOperation = "destination-out";
		this.swap.beginPath();
		this.swap.arc(...cc(L.x, L.y, L.range), 0, 2 * Math.PI);
		// this fill eats over 30-40ms on the first render,
		// then about 5ms per render, and I don't know why 
		this.swap.fill();
		this.swap.globalCompositeOperation = "source-over"

		this.drawLight(this.swap, L, R)

		ctx.save()
		// set up clipping path for shadow canvas
		ctx.beginPath();
		ctx.moveTo(...cc(L.x - L.range, L.y - L.range))
		ctx.lineTo(...cc(L.x + L.range, L.y - L.range))
		ctx.lineTo(...cc(L.x + L.range, L.y + L.range))
		ctx.lineTo(...cc(L.x - L.range, L.y + L.range))
		ctx.lineTo(...cc(L.x - L.range, L.y - L.range))
		
		ctx.clip()
		ctx.drawImage(this.swapCanvas,...b,...b)
		ctx.restore();

		// ensure the swap canvas is entirely black
		this.swap.fillRect(...b);
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
	lightBounds: function(L)
	{
		return [ L.x - L.range, L.y - L.range, L.range * 2, L.range * 2 ].map(x => x * cellSize)
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
			ctx.globalCompositeOperation = "copy"
			ctx.fillRect(0, 0, w, h)
			ctx.globalCompositeOperation = "destination-in"

			for (const l of L.filter(l => l.level == lightlevel.dim)) {
				this.putLight(ctx, l, R)
			}
			
			ctx.globalCompositeOperation = "destination-over"
		}
		else
			ctx.globalCompositeOperation = "copy"

		ctx.globalAlpha = this.dimLightAlpha

		if(P?.range)
		{
			const pl = [...cc(P.x, P.y, P.range), 0, 2 * Math.PI ];
			this.swap.save();
			ctx.save();

			// copy relevant area to swap canvas
			this.swap.globalCompositeOperation = "copy"
			this.swap.beginPath();
			this.swap.arc(...pl);
			this.swap.clip();
			const a = cc(P.x - P.range, P.y - P.range, P.range * 2, P.range * 2)
			this.swap.drawImage(ctx.canvas, ...a, ...a)
			
			// fill everything BUT the player's darkvision radius with the dum light color
			ctx.beginPath()
			ctx.arc(...pl)
			ctx.rect(w, 0, -w, h);
			ctx.fill();

			// copy swap canvas back onto regular canvas at 50% opacity
			ctx.globalCompositeOperation = "copy"
			ctx.beginPath();
			ctx.arc(...pl)
			ctx.clip();
			ctx.drawImage(this.swap.canvas, ...a, ...a);
			
			// fill swap canvas back in
			this.swap.fillRect(...a);

			ctx.restore();
			this.swap.restore();
		}
		else
			ctx.fillRect(0,0,w,h)
	
		ctx.globalCompositeOperation = "destination-in"
		ctx.globalAlpha = 1

		for (const l of L.filter(l => l.level == lightlevel.bright)) {
			this.putLight(ctx, l, R)
		}

		if(P)
		{
			ctx.globalCompositeOperation = "source-over"
			const maxR = max(max(vlensq(P),
					vlensq(vsub(P, v(0, map.height)))),
				max(vlensq(vsub(P, v(map.width, 0))),
					vlensq(vsub(P, v(map.width, map.height)))))
			this.drawLight(ctx, { x: P.x, y: P.y, range: Math.ceil(Math.sqrt(maxR)) }, R);
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