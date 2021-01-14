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

/** Shorthand for cc()ing vectors
 * @param {vec2} p 
 * @returns {Number[]} cc(...vx(p))
 */
function ccv(p)
{
	return cc(...vx(p))
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
 * If the lines are paralell, returns the first start or end that is within both.
 * (the order for this is a,c,b,d and points within lines are preferred over end points)
 * @param {vec2} a The first line segment's start
 * @param {vec2} b The first line segment's end
 * @param {vec2} c The second line segment's start
 * @param {vec2} d The second line segment's end
 * @returns {vec2?} The intersection, if it exists
 */
function lineLineIntersect(a,b,c,d)
{
	const div = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)

	if(approx(div, 0))
	{
		const lens = [ vsub(a,b), vsub(b,c), vsub(a,c) ].map(vlen)

		// Determine if lines are collinear
		if(!approx(lens[0] + lens[1] + lens[2], Math.max(...lens) * 2))
			return null;

		/** Determines if a point is in a line.
		 * Relies on the previous collinearity check.
		 * Returns the kind of position, 0 for not on the line,
		 * 1 for hit on the edge, 2 for hit within the line
		 * @param {vec2} lp start of line
		 * @param {vec2} lq end of line
		 * @param {vec2} k a point
		 * @returns {boolean) k in [lp;lq]
		 */
		function inLine(lp,lq,k)
		{
			if(approx(lp, k) || approx(lq, k))
				return 1;
			
			const diff = vmap(vsub(lq, lp), Math.abs);

			if(diff.x > diff.y)
				return gte(k.x, Math.min(lp.x, lq.x)) && gte(Math.max(lq.x, lp.x), k.x) ? 2 : 0;
			else
				return gte(k.y, Math.min(lp.y, lq.y)) && gte(Math.max(lq.y, lp.y), k.y) ? 2 : 0;
		}
		
		const hits = [ [ a, inLine(c,d,a) ], [ c, inLine(a,b,c) ], [ b, inLine(c,d,b) ], [ d, inLine(a,b,d) ] ];
		const hit = hits.find(h => h[1] == 2) ?? hits.find(h => h[1] == 1);

		return hit ? hit[0] : null;
	}

	const t = (a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)

	// Point outside |AB|
	if(!approx(t,div) && (Math.sign(div) != Math.sign(t) || Math.abs(t) > Math.abs(div)))
		return null;

	const u = (a.y - b.y) * (a.x - c.x) - (a.x - b.x) * (a.y - c.y)
	
	// Point outside [CD]
	if(!approx(u, div) && (Math.sign(div) != Math.sign(u) || Math.abs(u) > Math.abs(div)))
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

		const r2 = l.range * l.range;
		const nleft = left.len2 > r2 ? replaceOut(left) : left;
		const nright = right.len2 > r2 ? replaceOut(right) : right;

		return (closest == left || closest == right) ? [nleft, nright] : [nleft, closest, nright];
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
						b.X = Math.min(b.X, p.x)
						b.Y = Math.min(b.Y, p.y)
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
							b.X = Math.min(b.X, cur[i].X)
							b.Y = Math.min(b.Y, cur[i].Y)
		
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
	/** Represents a 2D line segment
	 * @typedef {Object} line A 2D line segment
	 * @property {pvec} s The starting point
	 * @property {pvec} e The ending point
	 */
	/** Determines an isomorphic set of lines without intersections or lines crossing the 0° axis.
	 * The return value is sorted by starting point angle.
	 * @param {light} l The light source
	 * @param {rect[]} R The hitboxes
	 * @returns {line[]} Said set of lines
	 */
	getLines: function(l, R)
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
		
		/** All lines
		 * @type {line[]}
		 */
		let S = this.distCull(R, l, l.range).flatMap( 
			/** Maps a rectangle to the lines making up its shadow outline.
			 * The return is sorted by angle.
			 * @param {rect} r
			 * @returns {line[]}
			 */
			function(r)
			{
				const s = rtx.shadowVertices(r,l)
				let L = [ { s: project(s[0]), e: s[0] } ];
	
				for (let i = 1; i < s.length; i++)
					L.push({ s: s[i - 1], e: s[i] });
	
				L.push({ s: s[s.length - 1], e: project(s[s.length - 1]) });
				return L.filter(l => !approx(l.s, l.e));
			});
		// TODO: cull occluded rectangles

		/*	perform successive x- and y-splices,
			transforming S to an isomorphic set containing only non-intersecting line segments
			leverages the edge-cases covered by lineLineIntersect() to handle colinear lines */
		for(;;)
		{
			let splitAny = false;

			// TODO: optimize this loop by not repeating low indices
			for (let i = 0; i < S.length; i++) {
				for (let j = i+1; j < S.length; j++) {
					if(approx(S[i].e, S[j].s) && approx(S[i].s, S[j].e))
					{
						S.splice(j,1);
						S.splice(i,1);
						splitAny = true;
						break;
					}

					let p = lineLineIntersect(S[i].s, S[i].e, S[j].s, S[j].e)

					if(p)
					{
						p = toPolar(p, l)
						const r = [{ s: S[i].s, e: p }, { s: S[j].s, e: p }, { s: p, e: S[i].e }, { s: p, e: S[j].e }]
							.filter(l => !approx(l.s, l.e))

						// don't perform v-splices as they will always yield the same lines again
						if(r.length > 2)
						{
							S[i] = r[0]
							S[j] = r[1]
							S.push(...r.splice(2));

							splitAny = true;
							break;
						}
					}
				}

				if(splitAny)
					break;
			}

			if(!splitAny)
				break;
		}

		S = S.flatMap(
		/** Split any lines crossing the 0°-axis along it
		 * @param {line} s 
		 */	
		function(s){
			function p(a)
			{
				const x = s.s.x
				return { x: x, y: l.y, angle: a, len2: (x - l.x) * (x - l.x) };
			}
			if(approx(s.s.x, s.e.x) && s.s.x > l.x)
			{
				/**
				 * @type {line[]}
				 */
				let r = null;

				if (s.s.y < l.y && s.e.y > l.y)
					r = [{ s: s.s, e:p(2 * Math.PI) }, { s: p(0), e: s.e }]
				else if (s.s.y > l.y && s.e.y < l.y)
					r = [{ s: s.s, e:p(0) }, { s: p(2 * Math.PI), e: s.e }]
				
				if(r && !r.some(l => approx(l.s, l.e)))
					return r;
			}

			return [ s ];
		})

		S.sort((a,b) => a.s.angle - b.s.angle);

		return S;
	},
	/** Renders a single light source onto the swap canvas.
	 * Does not fill shapes, just populates the canvas path
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {light} l
	 * @param {rect[]} R 
	 */
	drawLight: function(ctx, l, R)
	{
		// skip drawing lights inside blocks
		if(R.some(r => within(r.X, r.Y, r.Width, r.Height, l.x, l.y)))
			return;

		const rad = cc(l.x, l.y, l.range)
		let S = this.getLines(l, R);
		
		if(!S.length)
		{
			ctx.arc(...rad, 0, 2 * Math.PI);
			return;
		}

		let first;

		// determine first point
		{
			/** All possible starting points
			 * @type {line[]}
			 */
			const fset = S.min(s => s.s.angle)

			// The possible starting points connected to some possible end point
			const pfset = fset.filter(f => S.some(s => approx(s.e, f.s)));

			if(pfset.length)
				first = pfset.min(f => f.s.len2)[0]
			else
				first = fset.max(f => f.s.len2)[0]
		}

		/**
		 * @type {line}
		 */
		let cur = first;
		ctx.moveTo(...ccv(cur.s))

		while(S.length)
		{
			ctx.lineTo(...ccv(cur.e))

			// TODO: Optimize this filter using the sortedness of S
			S = S.filter(s => s != cur && gte(s.s.angle, cur.e.angle));
			const refangle = toPolar(l, cur.e).angle;

			/**
			 * @type {line}
			 */
			let next = S.filter(s => approx(s.s, cur.e))
				.map(s => ({ l:s, a : (toPolar(s.e, s.s).angle - refangle + 2 * Math.PI) % (2 * Math.PI)}))
				.map(la => ({ l:la.l, a: approx(la.a, 0) ? 2 * Math.PI : la.a }))
				.max(la => la.a)
				.max(la => vlensq(vsub(la.l.s, la.l.e)))[0]?.l;

			if(!next)
			{ // no connected next line

				// deals with horizontal lines colinear to the 0°-axis
				if(!approx(cur.s.angle, cur.e.angle) && cur.s.angle > cur.e.angle)
					break;

				S = S.filter(s => s.s.angle > cur.e.angle);
				
				next = S.min(s => s.s.angle)
					.max(s => s.s.len2)[0]

				if(next)
					ctx.arc(...rad, cur.e.angle, next.s.angle)
				else
					break;
			}
			
			cur = next;
		}

		if(approx(cur.e, first.s))
			ctx.lineTo(...ccv(first.s))
		else
			ctx.arc(...rad, cur.e.angle, first.s.angle);
	},
	/** Finds the player's darkvision light source
	 * @returns {light?}
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
			ctx.clear();
		else
		{
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
			ctx.restore()
		}

		if(P && map.rtxInfo.lineOfSight)
		{
			ctx.globalCompositeOperation = "source-over"
			const maxR = Math.max(vlensq(P),
				vlensq(vsub(P, v(0, map.height))),
				vlensq(vsub(P, v(map.width, 0))),
				vlensq(vsub(P, v(map.width, map.height))));
			
			ctx.beginPath();
			this.drawLight(ctx, { x: P.x, y: P.y, range: Math.ceil(Math.sqrt(maxR)) }, R);
			ctx.rect(w, 0, -w, h);
			ctx.fill();
		}
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
	ctx.lineWidth = 3
	ctx.globalAlpha = 1

	return ctx
}

function viz(o, cl)
{
	const c = debugctx();
	function rot(p, a, h)
	{
		let m = vmul(v(Math.cos(a), Math.sin(a)), 20);
		p = vmul(p, cellSize);

		c.moveTo(...vx(h ? p : vsub(p, m)))
		c.lineTo(...vx(vadd(p, m)))
	}

	function _viz(o)
	{	
		if(Array.isArray(o))
		{
			for (const i of o)
				_viz(i);
		}
		else if(typeof o.x === "number" && typeof o.y === "number")
		{
			rot(o, 0.25 * Math.PI)
			rot(o, -0.25 * Math.PI)
		}
		else if(typeof o.s === "object" && typeof o.e === "object")
		{
			c.moveTo(...ccv(o.s))
			c.lineTo(...ccv(o.e))
			let d = toPolar(o.e, o.s)
			rot(o.s, d.angle + 0.5 * Math.PI)
			rot(o.e, d.angle + 1.1 * Math.PI, true)
			rot(o.e, d.angle + 0.9 * Math.PI, true)
		}

	}

	if(cl)
		c.clear();

	console.log(c);
	c.beginPath();
	_viz(o);
	c.stroke();
}