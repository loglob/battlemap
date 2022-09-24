"use strict";

/** A map of all opaque tiles, indexed with x[row][column]
 * @typedef {boolean[][]} obsmap_t
*/

/** A light source
 * @typedef {Object} light
 * @property {number} x The absolute X coordinate
 * @property {number} y The absolute Y coordinate
 * @property {number} range The range (in tiles) of the light
 * @property {number} level The light level (as in light level enum)
*/

const lightLevel = {
	dark: 0,
	dim: 1,
	bright: 2,
}

const rtx = {
	/** @type {String} The source code of the shadow fragment shader. Loaded from rtx.glsl */
	shaderSrc: null,
	/** The vertex shader */
	vertexSrc:
`#version 300 es
in vec2 pos;
out vec2 map_pos;

uniform mediump ivec2 size;

void main()
{
	gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);
	map_pos = .5 * vec2(size) * (pos*vec2(1,-1) + vec2(1,1));
}`,
	/** Shader that just directly forwards an obstruction map */
	floodShaderSrc:
`#version 300 es
precision mediump float;

in vec2 map_pos;
out vec4 fragColor;

uniform ivec2 size;
uniform lowp sampler2D map;
uniform bool globalDim;

const float dim_alpha = .4;
const float pen_depth = .2;

int conn(float o)
{ return (o < pen_depth) ? -1 : (o > 1.0 - pen_depth) ? 1 : 0; }

bool solid(ivec2 p)
{ return p.x < 0 || p.y < 0 || p.x >= size.x || p.y >= size.y || texelFetch(map, p.yx, 0).r != 0.0; }

void main()
{
	ivec2 tile = ivec2(map_pos);

	if(!solid(tile))
	{ // no wall hit possible
		fragColor = vec4(0);
		return;
	}

	fragColor = vec4( 0, 0, 0, globalDim ? dim_alpha : 1.0);

	vec2 off = map_pos - vec2(tile);
	ivec2 ind = ivec2(conn(off.x), conn(off.y));

	if(ind == ivec2(0,0))
		return;
	else if(!solid(tile + ind))
		fragColor.w = 0.0;
	else if(ind.x != 0 && ind.y != 0 && (!solid(tile + ivec2(ind.x, 0)) || !solid(tile + ivec2(0, ind.y))))
		fragColor.w = 0.0;
}`,
	cache: {
		/** @type {WebGL2RenderingContext} The last context passed to draw() */
		lastGL: null,
		/** @type {WebGLProgram} The last linked & compiled shader program  */
		program: null,
		/** @type {boolean=} Whether .program is for the flood-fill shader */
		floodFill: null
	},
	/** Calculates all vertices of the obstructionMap
	 * @param {Set.<number>} opaqueSet
	 * @returns {obstructionMap} The obstruction map
	 */
	getObsmap: function(opaqueSet)
	{
		return map.colors.map(row => row.map(c => opaqueSet.has(c)))
	},
	/** Floods the given obstruction map. Doesn't check whether seeds are placed inside walls
	 * @param {obsmap_t} obsmap The original obstruction map
	 * @param {vec2[]} seeds The positions to fill from
	 * @return {obsmap_t} An obsmap of every unreachable or opaque tile
	 */
	floodFill: function(obsmap, seeds)
	{
		// initialize with darkness
		let lit = obsmap.map(x => x.map(_ => true));

		while(seeds.length)
		{
			let p = seeds.shift()

			if(!lit[p.x][p.y]) // avoid double scanning
				continue;

			lit[p.x][p.y] = false;

			for(let o of [ v(0,-1), v(0,1), v(1,0), v(-1,0) ])
			{
				let q = vadd(p, o);

				if(obsmap[q.x] && obsmap[q.x][q.y] === false)
					seeds.push(q)
			}
		}

		return lit;
	},
	/** Compiles a shader into cache, selecting shader based on map.rtxInfo
	 * @param {WebGL2RenderingContext} gl
	 */
	compile: function(gl)
	{
		let vert = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vert, this.vertexSrc);
		gl.compileShader(vert)

		let frag = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(frag, map.rtxInfo.floodFill ? rtx.floodShaderSrc : rtx.shaderSrc);
		gl.compileShader(frag)

		let prog = gl.createProgram();
		gl.attachShader(prog, vert);
		gl.attachShader(prog, frag);
		gl.linkProgram(prog);

		if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
			throw `Could not compile WebGL program: ${gl.getProgramInfoLog(prog)}`;
		if(this.cache.program)
		// not 100% sure if this is needed
			this.cache.lastGL.deleteProgram(this.cache.program);

		gl.useProgram(prog);

		// the input attribute of the vertex shader
		let pos = gl.getAttribLocation(prog, "pos");
		gl.enableVertexAttribArray(pos);

		let buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		// triangle strip for viewport rectangle
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ -1,-1, 1,-1,  -1,1,  1,1 ]), gl.STATIC_DRAW);

		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		rtx.cache = {
			lastGL: gl,
			program: prog,
			floodFill: map.rtxInfo.floodFill ?? false
		};
	},
	/** Populates the shader's uniforms, using values from the cache and current map state */
	setUniforms: function()
	{
		const u = x => rtx.cache.lastGL.getUniformLocation(rtx.cache.program, x)
		const gl = rtx.cache.lastGL

		gl.uniform2i(u("size"), map.width, map.height);

		{ // Create "texture" describing obsmap
			gl.activeTexture(gl.TEXTURE0);

			let obsmap = rtx.cache.floodFill ? rtxInterface.cache.floodmap : rtxInterface.cache.obsmap;

			let tex = gl.createTexture()
			gl.bindTexture(gl.TEXTURE_2D, tex);
			// NO idea why but webGL insists this is a float texture, despite the UNSIGNED_BYTE type
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, map.height, map.width, 0, gl.RED, gl.UNSIGNED_BYTE,
			// note that this is column-major !
				new Uint8Array(obsmap.flat()));

			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );

			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.uniform1i(u("map"), 0);
		}

		gl.uniform1i(u("globalDim"), map.rtxInfo.globallight > 0);

		// flood-fill shader doesn't need more info, as the flooding is done CPU-side
		if(rtx.cache.floodFill)
			return;

		let plr = uiInterface.findPlayer();

		if(plr)
			gl.uniform2f(u("player"), plr.X + plr.Width/2, plr.Y + plr.Height/2);

		gl.uniform1i(u("lineOfSight"), (map.rtxInfo.lineOfSight && plr) ? 1 : 0);

		let dv = Number(toolbox.tools.character.darkvision?.value);
		gl.uniform1f(u("darkvision"), (dv && plr) ? dv : 0);

		let dim = rtxInterface.cache.lights.filter(l => l.level === lightLevel.dim);
		let bright = rtxInterface.cache.lights.filter(l => l.level === lightLevel.bright);

		gl.uniform1i(u("dim_count"), dim.length);
		gl.uniform1i(u("bright_count"), bright.length);

		{ // Create "texture" describing lights
			gl.activeTexture(gl.TEXTURE1);

			let tex = gl.createTexture()
			let w = Math.max(dim.length, bright.length);

			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB32F, w, 2, 0, gl.RGB, gl.FLOAT, new Float32Array(
					bright.flatMap(l => [l.x, l.y, l.range]).concat(Array(3 * (w - bright.length)))
					.concat(dim.flatMap(l => [l.x, l.y, l.range])).concat(Array(3 * (w - dim.length)))
			 ));

			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
			gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );

			gl.uniform1i(u("lights"), 1);
		}
	},
	/** Fetches the shader (doesn't recompile) */
	fetchShader: function()
	{
		let req = new XMLHttpRequest();
		req.open("GET", "/js/rtx.glsl", false);
		req.send();

		this.shaderSrc = req.responseText;
	},
	/** Renders the shadow layer
	 * @param {WebGL2RenderingContext} gl
	 */
	draw: function(gl)
	{
		gl.clear(gl.COLOR_BUFFER_BIT);

		if(map.rtxInfo.globallight == lightLevel.bright)
			return;
		if(this.cache.lastGL != gl || this.cache.floodFill !== (map.rtxInfo.floodFill ?? false))
			this.compile(gl);

		this.setUniforms();
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}
};

const rtxInterface = {
	/**
	 * @typedef {Object} rtx_cache
	 * @property {Set.<number>} opaqueSet The set of opaque colors
	 * @property {light[]} lights The current light sources. (!) with fractional positions
	 * @property {obsmap_t} obsmap The current obstruction map
	 * @property {obsmap_t} floodmap The flood-filled obstruction map
	 */
	/** @type {rtx_cache} Stores intermediates from the last draw call to avoid expensive recalculations */
	cache: { },
	oldCache: "",
	enabled: !isDM,
	init : function()
	{
		if(this.initialized)
			return;

		rtx.fetchShader();
		layers.shadow.canvas.style.filter = "blur(10px)"
		this.onMapUpdate(mapFields.rtxInfo)

		this.initialized = true
	},
	/**
	 * @param {WebGL2RenderingContext} gl
	 */
	draw: function(gl)
	{
		if(!this.enabled)
		{
			gl.clear(gl.COLOR_BUFFER_BIT)
			return;
		}
		if(!this.initialized)
			this.init()

		rtx.draw(gl)
	},
	/** Called on map update
	 * @param {number} fields The change flags
	 */
	onMapUpdate: function(fields)
	{
		if((fields & (mapFields.size | mapFields.colors | mapFields.tokens | mapFields.rtxInfo)) == 0)
			return;

		if(fields & mapFields.rtxInfo)
			this.cache.opaqueSet = new Set(map.rtxInfo.opaque)
		if(fields & (mapFields.rtxInfo | mapFields.size | mapFields.colors))
			this.cache.obsmap = rtx.getObsmap(this.cache.opaqueSet);
		if(fields & (mapFields.rtxInfo | mapFields.tokens))
			this.cache.lights = map.tokens.map(tk => {
				let l = map.rtxInfo.sources[idName(tk)]
				if(l && ( !map.rtxInfo.hideHidden || !isHidden(tk) ))
					return { x: tk.X + tk.Width/2, y: tk.Y + tk.Height/2, level: l.level, range: l.range };
				else
					return null
			 }).filter(x => x);

		if(map.rtxInfo.floodFill &&
			(fields & (mapFields.colors | mapFields.size | mapFields.rtxInfo | mapFields.tokens)))
		{
			let seed = []

			if(map.rtxInfo.lineOfSight)
			{
				let plr = uiInterface?.findPlayer();

				if(plr)
					seed[0] = v(plr.X, plr.Y);
				else if(map.spawn)
					seed[0] = map.spawn.start;
				else
					console.error("No reference point for line-of-sight flood-fill found")
			}
			else
				seed = this.cache.lights.map(l => vmap(l, Math.floor) );

			this.cache.floodmap = rtx.floodFill(this.cache.obsmap, seed);
		}

		const newCache = JSON.stringify(this.cache)

		// Avoid expensive redraw
		if(!(fields & mapFields.size | mapFields.rtxInfo) && newCache === this.oldCache)
			return;

		this.oldCache = newCache;

		if(this.initialized)
			layers.shadow.draw()
	}
}
