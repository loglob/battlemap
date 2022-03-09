"use strict";
// map.js: Implements the new, multi-canvas UI

const renderOptions = {
	cramRenderer : {
		enabled : false,
		lineRatio : 4,
	},
};

//#region TextMetrics Extension Methods
// the height of the text
TextMetrics.prototype.getHeight = function()
{
	return this.actualBoundingBoxAscent + this.actualBoundingBoxDescent;
}

// The width to height ratio
TextMetrics.prototype.ratio = function()
{
	return this.width / this.getHeight();
}
//#endregion

//#region CanvasRenderingContext Extension Methods

/** Clears the entire canvas
 * @returns {void} nothing
 */
CanvasRenderingContext2D.prototype.clear = function()
{
	this.clearRect(0,0,w,h);
}

/** Draws a rectangle of the given thickness
 * @param {number} x The rectangle's x
 * @param {number} y The rectangle's y
 * @param {number} w The rectangle's width, measured at the outer edge
 * @param {number} h The rectangle's width, measured at the outer edge
 * @param {number} b The border width
 * @returns {void} nothing
 */
CanvasRenderingContext2D.prototype.irect = function(x, y, w, h, b)
{
	this.lineWidth = b
	this.rect(x + (b / 2), y + (b/2), w - b, h - b);
}

/**  Sets the font style of the canvas so that the given text would fit within a rectangle
 * @param {string} txt The text to fit
 * @param {number} width The rectangle's width
 * @param {number} height The rectangle's height
 * @param {string} [fontName="sans-serif"] The used font
 * @returns {TextMetrics & { fontSize: Number }} The final font metrics, including the new font size
 */
CanvasRenderingContext2D.prototype.fitText = function(txt, width, height, fontName = "sans-serif")
{
	let siz = height;
	this.font = `${siz}px ${fontName}`
	let s = this.measureText(txt);

	if(s.width > width)
	{
		siz = Math.floor((siz / s.width) * width);
		this.font = `${siz}px ${fontName}`
		s = this.measureText(txt);
	}

	let h = s.getHeight();

	if(h > height)
	{
		siz = Math.floor((siz / h) * height);
		this.font = `${siz}px ${fontName}`
		s = this.measureText(txt);
	}

	// workaround for emoji rendering
	s.fontSize = siz;

	return s;
}

/**  Renders text in the given box (stroke and fill).
 * Condenses whitespace and inserts whitespace to improve readability.
 * NOT IMPLEMENTED
 * @param {string} txt The text to fit
 * @param {number} width The rectangle's width
 * @param {number} height The rectangle's height
 * @param {string} [fontName="sans-serif"] The used font
 * @returns {number} The new font size, in px
 */
CanvasRenderingContext2D.prototype.cramText = function(txt, width, height, fontName = "sans-serif")
{
	this.font = `${height}px ${fontName}`
	const parts = txt.split(/\s+/);
	let measure = parts.map(this.measureText);
	let lines = 1;

}

/** Renders text in the given rectangle (stroke and fill). Does NOT automatically set proper font size.
 * align[0] describes vertical align, and is one of Top, Centered, Bottom or eXact
 * align[1] describes horizontal align, and is one of Left Centered or Right
 * @param {string} txt	The text to render
 * @param {number} x	The rectangle's x
 * @param {number} y	The rectangle's y
 * @param {number} w	The rectangle's width
 * @param {number} h	The rectangle's height
 * @param {string} [align="cc"] in /[tcbx][lcr]/
 * @param {Number?} [fontSize=null] If given, 0-height text boxes are interpreted as having that height
 * @returns {void} nothing
 */
CanvasRenderingContext2D.prototype.putText = function(txt, x, y, w, h, align = "cc", fontSize = null)
{
//	if(map_useCramRender && align === "cc")
//		return this.cramText(txt, x, y, w, h);

	const s = this.measureText(txt)
	// Properly handle emoji; they're reported as having a height of 0
	const badHeight = s.getHeight() == 0;
	const a = badHeight ? fontSize : s.actualBoundingBoxAscent
	const txtH = badHeight ? fontSize : a + s.actualBoundingBoxDescent

	let cY;

	switch(align[0])
	{
		case "t":
			cY = y + a;
		break;

		case "x":
			cY = y;
		break;

		case "c":
		default:
			cY = y + (h - txtH) / 2 + a;
		break;

		case "b":
			cY = y + h - txtH + a;
		break;
	}

	let cX;

	switch(align[1])
	{
		case "l":
			cX = x;
		break;

		case "c":
		default:
			cX = x + (w - s.width) / 2;
		break;

		case "r":
			cX = x + w - s.width
		break;
	}

	this.strokeText(txt, cX, cY);
	this.fillText(txt, cX, cY);
}

/** Combines fitText() followed by putText(). Places emoji properly.
 * @param {string} txt	The text to render
 * @param {number} x	The rectangle's x
 * @param {number} y	The rectangle's y
 * @param {number} w	The rectangle's width
 * @param {number} h	The rectangle's height
 * @param {string} [align="cc"] Same as for putText()
 * @param {string} [fontName="sans-serif"] The used font
 * @returns {TextMetrics & { fontSize: Number }} The metrics of the placed text
 */
CanvasRenderingContext2D.prototype.placeText = function(txt, x, y, w, h, align = "cc", fontName = "sans-serif")
{
	const m = this.fitText(txt, w, h, fontName);
	this.putText(txt, x, y, w, h, align, m.fontSize);

	return m;
}

/** Renders a token
 * @param {token} tk	The token
 * @param {number} x	The token's upper left x (canvas coords)
 * @param {number} y	The token's upper left y (canvas coords)
 * @param {string} color	The token's primary HTML color
 */
CanvasRenderingContext2D.prototype.putToken = function(tk, x, y, color = "black")
{
	if(isHidden(tk))
	{
		if(!isDM)
			return;

		this.globalAlpha = 0.5
	}

	const spl = tk.Name.split('\n')
	const idname = spl[0]
	const tknum = spl.length > 0 ? spl[1] : null
	const cW = cc(tk.Width);
	const cH = cc(tk.Height);

	// Draw an outline to make potentially empty occupied squares visible
	if(tk.Height * tk.Width > 1)
	{
		this.beginPath();
		this.strokeStyle = color
		this.fillStyle = color
		this.irect(x + 1, y + 1, cW - 2, cH - 2, 20)
		this.stroke();
	}

	let sprite = textures.get(idname);

	if(!sprite)
	{
		const txt = tk.Name;

		this.strokeStyle = "white"
		this.fillStyle = color
		this.lineWidth = 8
		const m = this.fitText(txt, cW - 20, cH - 20)

		if(tknum != null && (m.width / m.getHeight()) > 4)
		{
			this.placeText(idname, x + 10, y, cW - 20, (cH - 20)/2, "bc");
			this.placeText(tknum, x + 10, y + 20 + (cH - 20) / 2, cW - 20, (cH - 20) / 2, "tc")
		}
		else
			this.putText(txt, x + 10, y + 10, cW - 20, cH - 20, cc, m.fontSize)
	}
	else
	{
		this.drawImage(sprite, x + 1, y + 1, cW - 2, cH - 2);
		if(color != "black")
		{
			this.fillStyle = color;
			this.globalAlpha = 0.5
			this.fillRect(x + 1, y + 1, cW - 2, cH - 2);
			this.globalAlpha = 1.0
		}
		if(tknum != null)
		{
			this.strokeStyle = "white"
			this.fillStyle = color
			this.lineWidth = 8
			this.fitText(tknum, cW - 20, cH / 2 - 10)
			this.putText(tknum, x + 10, y + 10, cW - 20, cH - 20, "br");
		}
	}

	if(tk.Conditions)
	{
		const symbol = conditions.filter((v,i) => ((1 << i) & tk.Conditions) != 0).map(c => c.symbol).join("");

		this.fillStyle = "black"
		this.strokeStyle = "white"
		this.lineWidth = 5
		this.placeText(symbol, x+5, y + 5, cc(tk.Width) - 20, cc(tk.Height)/4, "tl");
		this.globalAlpha = 1;
	}

	if(currentTurn === tk)
	{
		this.beginPath();
		this.strokeStyle = "green"
		this.fillStyle = "green"
		this.irect(x + 5, y + 5, cW - 10, cH - 10, 5)
		this.stroke();
	}
}
//#endregion

// Sets the image for all commoners on the board
function peasant()
{
	for(let c of arguments.length ? arguments : new Set(map.tokens.map(tk => tk.Name).filter(n => /^commoner(\n.*)?$/i .test(n))))
		textures.uploadURL(c, "/img/commoner.png")
}

// Sets a token's image to a minecraft item texture
function mc(tk, item)
{
	if(tk === undefined)
	{
		for (const n of new Set(map.tokens.map(idName))) {
			mc(n);
		}

		return;
	}

	item = (item ?? tk).toLowerCase().replace(/ /g, "_")

	if(item === "bow")
		item = "bow_standby";
	else if(item === "clock" || item === "compass")
		item = `${item}_00`
	else if(item === "boots")
		item = "leather_boots"
	else if(item === "pants" || item === "trousers" || item === "leggings")
		item = "leather leggings"
	else if(item === "fish")
		item = "fish_cod_raw"
	else if(item === "bucket")
		item = "bucket_empty"
	else if(item === "chainmail")
		item = "chainmail_chestplate"
	else if(item === "bottle")
		item = "potion_bottle_empty"
	else if(item === "potion")
		item = "experience_bottle"
	else if(/^(helmet|chestplate|sword|pickaxe|axe|shovel|hoe)$/.test(item))
		item = `iron_${item}`

	textures.uploadURL(tk, `https://novaskinpacks-cbc.kxcdn.com/default/assets/minecraft/textures/items/${item}.png`)
}

//#region HTMLElement Extension Methods

/** Hides this element
 * @returns {void} nothing
 */
HTMLElement.prototype.hide = function()
{
	this.style.display = "none";
}

/** Unhides this element. Only works properly if no custom display style is wanted.
 * @returns {void} nothing
 */
HTMLElement.prototype.unhide = function()
{
	this.style.display = "initial";
}

//#endregion

/** Contains the canvas layers and their drawing functions
 * @type {Object.<string,layer_t>}
 * @typedef {Object} layer_t
 * @property {function} draw
 * @property {string} id
 * @property {HTMLElement} canvas
 * @property {CanvasRenderingContext2D} context
 */
const layers =
{
	/** Tile colors
	 * @constant {layer_t} */
	tile: {
		draw: function()
		{
			const ct = layers.tile.context
			ct.clear();

			for (let x = 0; x < map.width; x++) {
				for (let y = 0; y < map.height; y++) {
					const color = map.colors[x][y];

					if(color == 0xFFFFFF)
						continue;

					ct.fillStyle = colorString(color)
					ct.fillRect(cellSize * x, cellSize * y, cellSize, cellSize);
				}
			}
		}
	},
	/** The underlying grid pattern
	 * @constant {layer_t} */
	grid: {
		draw: function()
		{
			const ct = layers.grid.context

			ct.clear()
			ct.beginPath();

			for (let p = 0; p <= w; p+= cellSize) {
				ct.moveTo(p, 0);
				ct.lineTo(p, h);
			}

			for (let p = 0; p <= h; p+= cellSize) {
				ct.moveTo(0, p);
				ct.lineTo(w, p);
			}

			ct.stroke();
		}
	},
	/**@constant {layer_t} */
	effect: {
		draw: function()
		{
			var ct = this.context
			ct.clear();

			for (const e of map.effects) {
				const color = colorString(e.color)

				ct.beginPath()
				ct.globalAlpha = 0.6;
				ct.fillStyle = color
				ct.strokeStyle = color

				shape.draw(e.shape, ct);

				ct.fill()
				ct.stroke()
			}
		}
	},
	/** Tokens
	 * @constant {layer_t} */
	token: {
		/** Determines the primary color for a token
		 * @param {token} tk
		 * @returns {string} A HTML color string
		 */
		tokenColor: function(tk) {
			if(typeof uiInterface !== "undefined" && uiInterface?.getTokenColor)
				return uiInterface.getTokenColor(tk);

			return "black";
		},
		draw: function()
		{
			var ct = layers.token.context
			ct.clear()

			for (let tk of map.tokens)
			{
				ct.putToken(tk, ...cc(tk.X, tk.Y), this.tokenColor(tk));
			}
		},
		/** Redraws only the given token
		 * @param {token} tk
		 * @returns {void} nothing
		 */
		redrawToken: function(tk) {
			const ct = layers.token.context

			ct.clearRect(...cc(tk.X, tk.Y, tk.Width, tk.Height))
			ct.putToken(tk, ...cc(tk.X, tk.Y), this.tokenColor(tk))
		},
		/** Redraws all tokens with the given id name
		 * @param {string} idname
		 * @returns {void} nothing
		 */
		redrawAllTokens : function(idname) {
			for (const tk of map.tokens) {
				if(idName(tk.Name) === idname)
					this.redrawToken(tk);
			}
		}
	},
	/** Tokens highlighted by blink commands
	 * @constant {layer_t} */
	highlight: {
		draw: function()
		{
			const t = Date.now()
			let i = highlighted.length
			const ct = layers.highlight.context

			ct.clear()
			ct.strokeStyle = "darkorange";
			ct.fillStyle = "orange"
			ct.globalAlpha = 0.4;

			while(i--)
			{
				const dt = t - highlighted[i].time

				// blinking pattern: 400ms on, 400ms off, 400ms on
				if(dt > 1200)
				{
					highlighted.splice(i, 1)
				}
				else if(dt > 800 || dt < 400)
				{
					const h = highlighted[i]

					if(h.token)
					{

						ct.beginPath()

						if(h.initiative)
							ct.strokeStyle = "green";

						ct.irect(...cc(h.token.X, h.token.Y, h.token.Width, h.token.Height), 10)
						ct.globalAlpha = 1;
						ct.stroke();
						ct.globalAlpha = 0.4;


						if(h.initiative)
							ct.strokeStyle = "darkorange";
					}
					else if(h.pos)
					{
						ct.beginPath()
						ct.irect(...cc(h.pos.x, h.pos.y, 1, 1), 10)
						ct.globalAlpha = 1;
						ct.stroke();
						ct.globalAlpha = 0.4;
					}
					else if(h.shape)
					{
						ct.beginPath()
						shape.draw(h.shape, ct)
						ct.fill()
						ct.stroke()
					}
				}
			}
		},
	},
	/** Optional obscuremnt of the map. Controlled by the loaded RTX interface
	 * @constant {layer_t} */
	shadow: {
		draw: function()
		{
			if(typeof rtxInterface !== "undefined")
				rtxInterface.draw(this.context)
		}
	},
	/** Interactive UI elements, like hovering tokens and the ruler. Controlled by the loaded UI
	 * @constant {layer_t} */
	special: {
		draw: function()
		{
			if(typeof uiInterface !== "undefined")
				uiInterface.draw(this.context);
		}
	},
}

/**@type {highlighted_t[]}
 * @typedef {Object} highlighted_t
 * @property {number} time	Creation timestamp
 * @property {token=} token	Highlighted token
 * @property {vec2=} pos	Highlighted tile
 * @property {shape=} shape	Highlighted shape
 * @property {boolean=} initiative	If this is an initiative highlight (token must be defined)
*/
var highlighted = []

/**@type {?token} */
var currentTurn = null

// Deprecates the old sprites interface
const textures = {
	/**@type {Object.<string, HTMLElement>} */
	images : {},
	/**Upscales a small image pixel by pixel
	 * @param {HTMLElement} img
	 * @returns {HTMLElement} the upscaled image
	 */
	upscale: function(img)
	{
		let px = Math.floor(cellSize / img.width)
		let py = Math.floor(cellSize / img.height)
		let x0 = Math.floor((cellSize - px * img.width) / 2)
		let y0 = Math.floor((cellSize - py * img.height) / 2)

	//	let c = new OffscreenCanvas(cellSize, cellSize)
		let c = document.createElement("canvas")
		c.width = cellSize
		c.height = cellSize
		let ct = c.getContext("2d");

	//	let imgc = new OffscreenCanvas(img.width, img.height)
		let imgc = document.createElement("canvas")
		imgc.width = img.width
		imgc.height = img.height

		let imgct = imgc.getContext("2d")
		imgct.drawImage(img, 0, 0);

		let d = imgct.getImageData(0, 0, img.width, img.height).data;

		for (let y = 0; y < img.height; y++) {
			for (let x = 0; x < img.width; x++) {
				let col = 4 * (x + y * img.width)

				ct.fillStyle = `rgba(${d[col]}, ${d[col + 1]}, ${d[col + 2]}, ${d[col + 3] / 0xFF})`
				ct.fillRect(x0 + x * px, y0 + y * py, px, py)
			}

		}

		return c;
	},
	/**Sets a token's sprite to an image URL
	 * @param {string} token
	 * @param {string} url
	 * @returns {void} nothing
	 */
	uploadURL: function(token, url){
		fetch(`/image/link?map=${map.id}&token=${encodeURIComponent(token)}&url=${encodeURIComponent(url)}`)
			.then(r => {
				if(!r.ok)
					console.error(`Failed to upload image from url '${url}', status code ${r.status}:${r.statusText}`)
			})
			.catch(console.error);
	},
	/**Sets a token's sprite to a blob of image data
	 * @param {string} token
	 * @param {Blob} blob
	 * @returns {void} nothing
	 */
	uploadBlob : function(token, blob){
		if(blob.size > 1024*1024)
		{
			console.log("Cannot upload files over 1MiB")
			return
		}

		fetch(`/image/upload?map=${map.id}&token=${encodeURIComponent(token)}`, { method: "POST", body: blob })
			.then(response => {
				if(!response.ok)
				{
					console.log(`Error: upload: From Blob: Upload error: ${response.status}, ${response.statusText}`)
				}
			}).catch(e => {
				console.log(`Error: Upload: From Blob: Upload exception:`);
				console.log(e);
			})
	},
	/**Deletes a token's image
	 * @param {string} token
	 * @returns {void} nothing
	 */
	delete : function(token) {
		fetch(`/image/remove?map=${map.id}&token=${encodeURIComponent(token)}`)
			.then(response => {
				if(!response.ok)
				{
					console.log(`Error: delete sprite: Status: ${response.status}, ${response.statusText}`)
				}
			}).catch(e => {
				console.log(`Error: delete sprite: exception:`);
				console.log(e);
			})
	},
	/**Called after images is updated, before any UI changes are executed.
	 * @param {string} token
	 * @returns {void} nothing
	 */
	onImageChange : function(token) {
		layers.token.redrawAllTokens(token)
	},
	/** Updates the given token's image by looking up its map.sprites entry
	 * @param {string} name
	 * @returns {void} nothing
	 */
	update: function(name){
		const idname = idName(name)

		if(map.sprites[idname])
		{
			const url = `/image/get/${map.sprites[idname]}`;
			let img = new Image();

			img.loading = "eager";
			img.crossOrigin = "anonymous";
			img.decoding = "async";
			img.src = url;

			img.decode().then(e => {
				if(img.width <= 32 && img.height <= 32)
					img = this.upscale(img);

				this.images[idname] = img;
				this.onImageChange(idname);
			}).catch(e => {
				console.error(`Error decoding image for ${idname} (url ${url})`)
				console.error(e);
			})
		}
		else if(this.images[idname])
		{
			this.images[idname] = null;
			this.onImageChange(idname);
		}
	},
	/** Retrieves a token's sprite
	 * @param {string} name
	 * @returns {HTMLElement?} nothing
	 */
	get: function(name){
		return this.images[name] ?? null;
	},
	init: function() {
		for (const tk in map.sprites)
			this.update(tk);
	}
}

// The interface external scripts interact with
const mapInterface = {
	/** Highlights a token or tile
	 * @param {number} k The kind, as defined by blinkKind
	 * @param {number} x The token or tile's x
	 * @param {number} y The token or tile's y
	 * @returns {void} nothing
	 */
	blink: function(k,x,y)
	{
		let tk = tokenAtExact(x,y);

		switch(k)
		{
			case blinkKind.tile:
				highlighted.push({ time: Date.now(), pos: { x: x, y: y } })
			break;

			case blinkKind.token:
				highlighted.push({ time: Date.now(), token: tk });
			break;

			case blinkKind.initiative:
				if(!isHidden(tk) || isDM)
					highlighted.push({ time: Date.now(), token: tk, initiative: true });

				const _ct = currentTurn
				currentTurn = tk;

				if(_ct)
					mapInterface.redrawToken(_ct);
				mapInterface.redrawToken(currentTurn);
			break;
		}

		const f = layers.highlight.draw

		f()
		window.setTimeout(f, 401)
		window.setTimeout(f, 801)
		window.setTimeout(f, 1201)
	},
	/** Highlights a shape
	 * @param {shape} s
	 * @returns {void} nothing
	 */
	blinkShape: function(s) {
		const t = Date.now()
		highlighted.push({ time: t, shape: s })

		for (const tk of map.tokens) {
			if(shape.containsToken(s, tk) && (isDM || !isHidden(tk)))
				highlighted.push({ time: t, token: tk });
		}

		const f = layers.highlight.draw

		f()
		window.setTimeout(f, 401)
		window.setTimeout(f, 801)
		window.setTimeout(f, 1201)

		if(typeof uiInterface !== "undefined")
			uiInterface.onBlinkShape(s)
	},

	/** Removes a sprite
	 * @param {string} imageID
	 * @returns {void} nothing
	 */
	removeSprite: function(img) {
		sprites.images[img] = null
		layers.token.draw()
	},
	/** Called on receiving a new image
	 * @param {string} idname The token's name
	 * @returns {void} nothing
	 */
	gotImage: function(idname){
		textures.update(idname)
	},
	/** Handles outside changes in the map object. Called when the map datastructure updates.
	 * @param {number} fieldIds map field flags, as defined in mapFields
	 * @param {bool?} isResync set to true if the map update was a resync command
	 * @returns {void} nothing
	 */
	onMapUpdate: function(fieldIds, isResync)
	{
		if(fieldIds & mapFields.size)
		{
			w = cc(map.width)
			h = cc(map.height)

			for(let layer in layers)
			{
				layers[layer].canvas.width = w
				layers[layer].canvas.height = h
				layers[layer].draw()
			}
		}
		else
		{
			if(fieldIds & mapFields.colors)
				layers.tile.draw();
			if(fieldIds & mapFields.tokens)
				layers.token.draw();
			if(fieldIds & mapFields.effects)
				layers.effect.draw();
		}

		if(typeof uiInterface !== "undefined" && uiInterface)
			uiInterface.onMapUpdate(fieldIds, isResync)
		if(typeof rtxInterface !== "undefined" && rtxInterface)
			rtxInterface.onMapUpdate(fieldIds)
	},

	/** Redraws only the given token
	 * @param {token} token
	 * @returns {void} nothing
	 */
	redrawToken: function(token) {
		layers.token.redrawToken(token);
	},

	/** Uploads an image of arbitrary form.
	 * Passing null deletes the image;
	 * Passing a string treats it as an image URL;
	 * Passing a Blob treats it as image data
	 * @param {string} token
	 * @param {null|string|Blob} img
	 */
	uploadImage: function(token, img) {
		if(img === null)
			textures.delete(token);
		else if(typeof img === "string")
			textures.uploadURL(token, img)
		else
			textures.uploadBlob(token, img)
	},

	/** Hooks required events and performs init that needs a loaded document
	 * @returns {void} nothing
	 */
	init: function()
	{
		var stack = document.getElementById("canvas_stack");

		for(let name in layers)
		{
			var l = layers[name]
			l.id = name + "_layer";
			l.canvas = document.createElement("canvas")
			l.canvas.width = w
			l.canvas.id = l.id
			l.canvas.height = h

			stack.appendChild(l.canvas);

			l.context = l.canvas.getContext("2d")
			l.draw();
		}

		textures.init();
	}
}
