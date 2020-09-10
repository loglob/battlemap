"use strict";

// The mouse position before the current move event.
// (int x, int y)?
var oldmousepos;
// (int x, int y)?
var mousepos;

// automagically initializes fields to document elements with the id toolname_fieldname
const initpls = "_initpls_";

var canvasStyle = document.getElementById("canvas_stack").style;

function resize(left,right,up,down,force)
{
	// check for deleted tokens
	if(!force && (left < 0 || right < 0 || up < 0 || down < 0))
	{
		let count = 0;

		for (const tk of map.tokens) {
			if(cutByResize(tk, left, right, up, down))
				count++;
		}

		if(count)
			throw `Resize would delete ${count} ${count == 1 ? "Token" : "Tokens"}`
	}

	maphub.setSize(left,right,up,down)
}

/* Handles the DM toolbox */
const toolbox = {
	div: document.getElementById("toolbox"),
	enabled: document.getElementById("toolbox") != null,
	tools : {
		cursor: {
			onMouseDown:function(evnt) {
				const cX = tile(evnt.pageX)
				const cY = tile(evnt.pageY)
				const tk = tokenAt(cX, cY)
		

				if(evnt.shiftKey)
				{
					selection.current = selection.ruler
				}
				else if(evnt.ctrlKey)
				{
					selection.circle.reset();
					selection.mask.reset();
					//selection.current = selection.circle;
					selection.current = selection.select
					selection.select.kind = "circle"
				}
				else if(tk == null || (!isDM && tk.Hidden))
				{
					selection.circle.reset();
					selection.mask.reset();
					selection.current = selection.mask
					//selection.current = selection.select
					//selection.select.kind = "mask"
				}
				else if(selection.circle.isSelected(tk))
				{
					selection.current = selection.circle;
					//selection.current = selection.select
					//selection.select.kind = "circle"
					//layers.token.draw();
					//mapInterface.redrawToken(tk);
				}
				else if(selection.mask.isSelected(tk))
				{
					selection.current = selection.mask
					//selection.current = selection.select
					//selection.select.kind = "mask"
					//layers.token.draw();
					//mapInterface.redrawToken(tk);
				}
				else
				{
					selection.current = selection.token
					selection.token.token = tk
					//layers.token.draw();
					//mapInterface.redrawToken(tk);
				}
			},
			getCursor: function(){
				return (selection.current == null) ? "default" : selection.current.getCursor();
			}
		},
		addtoken: {
			Name: document.getElementById("addtoken_name"),
			Width: document.getElementById("addtoken_width"),
			Height: document.getElementById("addtoken_height"),
			Num: "initpls",
			name: "",
			num: 1,
			dontBlink: true,
			onMouseDown: function(evnt) {
				if(evnt.ctrlKey)
				{
					const tk = tokenAt(tile(evnt.pageX), tile(evnt.pageY))

					if(tk)
					{
						const spl = tk.Name.split('\n');

						/*if(spl.length > 1)
							this.num = parseInt(spl[1].substring(1))
						else
							this.num = 0*/

						this.Name.value = spl[0]
						this.Num.value = (spl.length > 1) ? parseInt(spl[1].substring(1)) : 1;

						return;
					}
				}
				if(evnt.shiftKey)
				{
					let num = parseInt(this.Num.value)
					maphub.add(this.Name.value + "\n#" + num++, tile(evnt.pageX), tile(evnt.pageY),
						parseInt(this.Width.value), parseInt(this.Height.value))
					this.Num.value = num;
				}
				else
				{
					maphub.add(this.Name.value, tile(evnt.pageX), tile(evnt.pageY),
						parseInt(this.Width.value), parseInt(this.Height.value))

					//toolbox.tools.cursor.button.click();
				}
			},
			getCursor: function() {
				return "copy";
			},
			onSelect: function() {
//				selection.current = selection.newToken
			},
			onPutAway: function() {
//				selection.current = null;
			}
		},
		removetoken: {
			dontBlink: true,
			onMouseDown: function(evnt) {
				const cx = tile(evnt.pageX)
				const cy = tile(evnt.pageY)

				if(evnt.shiftKey)
				{
					const tk = tokenAt(cx, cy)

					if(tk)
						mapInterface.uploadImage(idName(tk), null);
				}
				else
					maphub.remove(tile(evnt.pageX), tile(evnt.pageY))

//				if(!evnt.shiftKey)
//					toolbox.tools.cursor.button.click();
			},
			getCursor: function() {
				return "crosshair";
			}
		},
		tileedit: {
			dontBlink: true,
			Color: document.getElementById("tileedit_color"),
			onMouseDown: function(evnt) {
				if(evnt.shiftKey || evnt.ctrlKey)
				{
					const col = "#" + map.colors[tile(evnt.pageX)][tile(evnt.pageY)].toString(16).padStart(6, "0")
					this.Color.value = col
				}
				else
				{
					maphub.color(tile(evnt.pageX), tile(evnt.pageY), parseInt(this.Color.value.substring(1), 16))
					document.onmousemove = function(evnt) {
						const cX = tile(evnt.pageX)
						const cY = tile(evnt.pageY)

						if(tile(mousepos.x) != cX || tile(mousepos.y) != cY)
							maphub.color(cX, cY, parseInt(toolbox.tools.tileedit.Color.value.substring(1), 16))
						
						mousepos = { x: evnt.pageX, y: evnt.pageY }
					}		
				}
			},
			getCursor: function() {
				return "default";
			}
		},
		resize: {
			left: initpls,
			right: initpls,
			up: initpls,
			down: initpls,
			error: initpls,
			savebutton: initpls,
			force: false,
			onMouseDown: function(e) { toolbox.tools.cursor.onMouseDown(e) },
			getCursor: function() { toolbox.tools.cursor.getCursor() },
			onInput: function(dir) {	
				if(((dir == "left" || dir == "right") && parseInt(this.left.value) + parseInt(this.right.value) < -map.width)
					|| ((dir == "up" || dir == "down") && parseInt(this.up.value) + parseInt(this.down.value) < -map.height))
				{
					this[dir].value++
					return;
				}

				this.reset()
				layers.special.draw();
			},
			reset: function() {
				this.error.hide()
				this.force = false
				this.savebutton.innerText = "Save"
				layers.special.draw();
		
			},
			save: function() {
				const l = parseInt(this.left.value)
				const r = parseInt(this.right.value)
				const u = parseInt(this.up.value)
				const d = parseInt(this.down.value)

				//console.log(`Resize: ${l} ${r}: ${u} ${d}`);

				try
				{
					resize(l,r,u,d, this.force);
					this.reset()
					this.left.value = 0
					this.right.value = 0
					this.up.value = 0
					this.down.value = 0
				}
				catch(msg)
				{
					this.error.innerText = msg
					this.error.unhide()
					this.savebutton.innerText = "Save anyway"
					this.force = true
				}

				layers.special.draw();
			},
			onSelect: function() {
				layers.special.draw();
			},
			onPutAway: function() {
				layers.special.draw();
				this.reset()
			},
			draw: function(ct) {
				ct.clear()
				ct.globalAlpha = 0.5
				ct.fillStyle = "red"
				const l = Math.min(map.width, Math.max(0, -parseInt(toolbox.tools.resize.left.value)))
				const r = Math.min(map.width, Math.max(0, -parseInt(toolbox.tools.resize.right.value)))
				const u = Math.min(map.height, Math.max(0, -parseInt(toolbox.tools.resize.up.value)))
				const d = Math.min(map.height, Math.max(0, -parseInt(toolbox.tools.resize.down.value)))
	
				if(l)
					ct.fillRect(0, u * cellSize, l * cellSize, h)
				if(u)
					ct.fillRect(0, 0, w - r * cellSize, u * cellSize)
				if(r)
					ct.fillRect(w - r * cellSize, 0, r * cellSize, h - d * cellSize)
				if(d)
					ct.fillRect(l * cellSize, h - d * cellSize, w, d * cellSize)

				return 1;
			}
		},
		effects: {
			onMouseDown: function(e) { toolbox.tools.cursor.onMouseDown(e) },
			getCursor: function() { toolbox.tools.cursor.getCursor() },
			genDiv: function(item) {
				let div = document.createElement("div");
				let name = document.createElement("span")

				const diff = vsub(item.end, item.start)

				if(item.kind === "mask")
					name.innerText = `${Math.abs(diff.x) + 1}x${Math.abs(diff.y) + 1} rectangle`;
				else
					name.innerText = `${Math.round(vlen(diff)) * 5}' ${item.kind}`

				div.appendChild(name);

				if(item.local)
				{
					let color = document.createElement("input");
					color.setAttribute("type", "color")
					color.value = colorString(item.color)
					color.oninput = e => { item.color = parseColor(color.value) }
					div.appendChild(color)

					let saveLink = document.createElement("a");
					saveLink.innerText = "💾"
					saveLink.onclick = () => { effects.save(item) }
					div.appendChild(saveLink)
				}

				let blinkLink = document.createElement("a");
				blinkLink.innerText = "👁️"
				blinkLink.onclick = () => { effects.blink(item) }
				div.appendChild(blinkLink)

				let delLink = document.createElement("a");
				delLink.innerText = "🗑️"
				delLink.onclick = () => { effects.remove(item) }
				div.appendChild(delLink);

				return div
			},
			genWindow: function() {
				this.window.innerHTML = ""

				for(const e of map.effects) {
					this.window.appendChild(this.genDiv(e))
				}
				for (const e of effects.list) {
					this.window.appendChild(this.genDiv(e))
				}
			},
			onUpdate: function() {
				this.genWindow()
			},
			onSelect: function() {
				this.genWindow()
			},
		},
		shapes: {
			selection: initpls,
			onMouseDown: function(e) {
				const tk = tokenAt(tile(e.pageX), tile(e.pageY))

				if(selection.shape.shape && (!tk || !selection.shape.isSelected(tk)))
					selection.shape.reset();

				selection.current = selection.shape
			},
			getCursor: function() { return toolbox.tools.cursor.getCursor() },
			init: function() {
				for(let s in shape)
				{
					if(typeof shape[s] === "object")
					{
						let opt = document.createElement("option");
						opt.setAttribute("value", s)
						opt.innerText = s[0].toUpperCase() + s.substring(1);
	
						this.selection.appendChild(opt)
					}
				}
			},
		},
		dice: {
			pips: [ 2, 4, 6, 8, 10, 12, 20, 100 ],
			onMouseDown: function(evnt) {
				return toolbox.tools.cursor.onMouseDown(evnt);
			},
			getCursor: function() {
				return toolbox.tools.cursor.getCursor();
			},
			roll : function(p) {
				let roll = Math.floor(Math.random() * p) + 1;
				
				const n = document.getElementById(`dice_d${p}_numbers`);
				let numbers = [roll].concat(JSON.parse(`[${n.innerText}]`));
				n.innerText = numbers.join(", ");

				document.getElementById(`dice_d${p}_name`).innerText = `${numbers.length}d${p}`;

				const totalMatch = /[0-9]+$/;

				const t = document.getElementById(`dice_d${p}_total`)
				let total = parseInt(t.innerText.match(totalMatch)[0]) + roll
				t.innerText = `total: ${total}`

				const st = document.getElementById("dice_total")
				let supertotal = parseInt(st.innerText.match(totalMatch)[0]) + roll
				st.innerText = `Supertotal: ${supertotal}`

				return false;
			},
			del: function(p) {
				document.getElementById(`dice_d${p}_numbers`).innerText = "";
				document.getElementById(`dice_d${p}_name`).innerText = `0d${p}`;
				
				const totalMatch = /[0-9]+$/;

				const t = document.getElementById(`dice_d${p}_total`)
				const total = parseInt(t.innerText.match(totalMatch)[0])

				t.innerText = "total: 0";

				const st = document.getElementById("dice_total")
				let supertotal = parseInt(st.innerText.match(totalMatch)[0]) - total
				st.innerText = `Supertotal: ${supertotal}`;
			},
			deleteAll: function() {
				for (const p of this.pips) {
					document.getElementById(`dice_d${p}_numbers`).innerText = "";
					document.getElementById(`dice_d${p}_name`).innerText = `0d${p}`;
					document.getElementById(`dice_d${p}_total`).innerText = "total: 0";
				}

				document.getElementById("dice_total").innerText = "Supertotal: 0"
			},
			init: function() {
				for (const p of this.pips) {
					const die = document.createElement("p");
					const span = document.createElement("span")
					span.setAttribute("class", "spread");

					const dn = document.createElement("b");
					dn.onclick = () => { toolbox.tools.dice.roll(p) }
					dn.setAttribute("id", `dice_d${p}_name`)
					span.appendChild(dn);

					const del = document.createElement("span");
					del.innerText = "🗑️";
					del.onclick = () => { toolbox.tools.dice.del(p) }
					span.appendChild(del);

					const total = document.createElement("span");
					total.setAttribute("id", `dice_d${p}_total`)
					span.appendChild(total);

					die.appendChild(span);

					const numbers = document.createElement("span");
					numbers.setAttribute("id", `dice_d${p}_numbers`)
					numbers.onclick = () => { toolbox.tools.dice.roll(p) }
					die.appendChild(numbers);

					die.setAttribute("class", "noselect clickable")
					this.window.appendChild(die);
				}

				const sp = document.createElement("span");
				sp.setAttribute("class", "spread")

				const st = document.createElement("span");
				st.setAttribute("id", "dice_total");
				sp.appendChild(st);

				const da = document.createElement("span");
				da.innerText = "🗑️"
				da.setAttribute("class", "clickable noselect")
				da.onclick = () => this.deleteAll()

				sp.appendChild(da);

				this.window.appendChild(sp);
				this.deleteAll();
			}
		},
		hide: {
			dontBlink: true,
			onMouseDown: function(evnt) {
				const tk = tokenAt(tile(evnt.pageX), tile(evnt.pageY))

				if(tk)
					maphub.setHidden(tk.X, tk.Y, !tk.Hidden);
			},
			getCursor: function() { return "help" },
		},
		settings: {
			Denom: document.getElementById("setting_sqrt2_denom"),
			Num: document.getElementById("setting_sqrt2_num"),
			onMouseDown: function(e) { toolbox.tools.cursor.onMouseDown(e) },
			getCursor: function() { toolbox.tools.cursor.getCursor() },
			save: function() {
				const n = parseInt(this.Num.value)
				const d = parseInt(this.Denom.value)
				maphub.setRoot2(n, d)
			}
		},
		spawnzone: {
			dontBlink: true,
			onSelect: function() {
				layers.special.draw();
			},
			onMouseDown: function(evnt) {
				selection.current = selection.spawnzone;
			},
			draw: function(ct) {
				if(map.spawn)
				{
					ct.beginPath();

					ct.fillStyle = "yellow"
					ct.globalAlpha = 0.333
					shape.draw(map.spawn, ct)

					ct.fill();
					ct.stroke();
				}
			},
			onPutAway: function() {
				layers.special.draw();
			},
			getCursor: function() { return "copy" },
		}
	},
	activeTool: null,
	init: function(){
		this.activeTool = this.tools.cursor

		if(this.enabled)
		{
			for(let name in this.tools)
			{
				const tool = this.tools[name]
				tool.window = document.getElementById(name + "_window")
				tool.button = document.getElementById(name + "_button")

				if(tool.button != null)
					tool.button.onclick = function(evnt){
						if(toolbox.activeTool == tool)
							return;
						
						for(let name in toolbox.tools)
						{
							const t = toolbox.tools[name]
							if(t != tool && t.window != null)
								t.window.hide()
						}


						canvasStyle.cursor = tool.getCursor()
						
						if(tool.window != null)
							tool.window.unhide();

						const ltool = toolbox.activeTool

						toolbox.activeTool = tool

						if(ltool.onPutAway)
							ltool.onPutAway();
						if(tool.onSelect)
							tool.onSelect();
					}

				for(let v in tool)
				{
					if(tool[v] === initpls)
						tool[v] = document.getElementById(`${name}_${v}`.toLowerCase())
				}

				if(tool.init)
					tool.init();
			}
		}
	},
}

/* Handles visual effects */
const effects = {
	// { color, kind, start: { x, y }, end: { x, y }, local }
	list : [],
	preview: null,
	tool: toolbox.tools.effects,
	/* Pushed a local effect to persistent */
	save: function(effect) {
		this.list.remove(effect)
		maphub.addEffect(...shape.expand(effect), effect.color)
	},
	/* Removes an effect. Handles both persistent and local effects. */
	remove: function(effect) {
		if(effect.local)
		{
			this.list.remove(effect)
			this.onEffectUpdate()
		}
		else
			maphub.removeEffect(...shape.expand(effect))
	},
	blink: function(effect) {
		maphub.blinkShape(...shape.expand(effect))
	},
	onBlinkShape: function(s) {
		if(this.list.some(e => shape.equal(e,s)))
			return;

		this.list.push({ color:0, kind: s.kind, start: s.start, end: s.end, local: true });
		this.onEffectUpdate()
	},
	onEffectUpdate: function() {
		if(this.tool.window)
			this.tool.onUpdate()
	}
}

/* Handles a ruler at the bottom left of the ui */
const rulerDisplay = {
	div: document.getElementById("distance"),
	enable : function(){
		this.div.unhide()
	},
	update : function(){
		let d = undefined;
		if(selection.current && selection.current.specialRuler)
			d = selection.current.specialRuler()
		if(d === undefined)
			d = dist(tile(selection.pos.x), tile(selection.pos.y), tile(mousepos.x), tile(mousepos.y));

		this.div.innerText = `📏 ${d}'`
	},
	disable : function(){
		this.div.hide()
	}
}

/* Contains the selection tools that are used with the mouse */
const selection = {
	current: null,
	last: null,
	// copy of mousepos at time of creation
	pos: null,
	getShape: function() {
		return this.mask.rect ?? this.circle.circ ?? this.select.shape ?? this.shape.shape;
	},
	token: {
		hasRuler: true,
		token: null,
		tkCanvas: null,
		offset: { x: 0, y: 0 },
		draw: function(ctx) {
			/*ctx.clearRect(
				oldmousepos.x + this.offset.x, oldmousepos.y + this.offset.y,
				this.tkCanvas.width, this.tkCanvas.height)*/
			
			ctx.drawImage(this.tkCanvas, mousepos.x + this.offset.x, mousepos.y + this.offset.y);
		},
		onPickup: function() {
			const c = this.tkCanvas ?? document.createElement("canvas");
			c.width = cellSize * this.token.Width
			c.height = cellSize * this.token.Height
			
			//c.getContext("2d").putToken(this.token, 0, 0)

			const tkw = this.token.Width * cellSize
			const tkh = this.token.Height * cellSize

			c.getContext("2d").drawImage(
				layers.token.canvas,
				this.token.X * cellSize, this.token.Y * cellSize,
				tkw, tkh,
				0, 0,
				tkw, tkh)

			mapInterface.redrawToken(this.token)

			this.offset = { x: 10 + this.token.X * cellSize - mousepos.x,
				y: 10 + this.token.Y * cellSize - mousepos.y,  }

			this.tkCanvas = c;
		},
		onDrop: function(x,y) {
			maphub.move(tile(selection.pos.x), tile(selection.pos.y), tile(x), tile(y))
			this.tkCanvas = null;
		},
		getCursor: function() {
			return "grabbing"
		},
		tokenColor: "gray",
		isSelected: function(token) {
			return token === this.token
		}
	},
	ruler: {
		hasRuler: true,
		draw: function(ctx) {
			ctx.beginPath();
			ctx.strokeStyle = "orange"
			ctx.lineWidth = 20
			ctx.moveTo(selection.pos.x, selection.pos.y);
			ctx.lineTo(mousepos.x, mousepos.y);
			ctx.stroke();
		},
		onDrop: function(x,y) {	},
		getCursor: function() { return "auto" }
	},
	mask: {
		hasRuler: false,
		rect: null,
		isSelected: function(tk) {
			return this.rect && shape.containsToken(this.rect, tk)
		},
		getCursor: function() {
			return (this.rect != null) ? "grabbing" : "default"
		},
		draw: function(ct) {
			const dx = mousepos.x - selection.pos.x
			const dy = mousepos.y - selection.pos.y

			if(this.rect)
			{
				for(let tk of map.tokens)
				{
					if(!shape.containsToken(this.rect, tk))
						continue;

					ct.putToken(tk, mousepos.x + tk.X * cellSize - selection.pos.x,
						mousepos.y + tk.Y * cellSize - selection.pos.y);
				}
			}
			else
			{
				ct.beginPath()
				ct.globalAlpha = 0.6
				ct.strokeStyle = "blue"
				ct.fillStyle = "lightblue"
				ct.lineWidth = 2
	
				ct.fillRect(selection.pos.x, selection.pos.y, dx, dy)
				ct.rect(selection.pos.x, selection.pos.y, dx, dy);
				ct.stroke();
			}
		},
		drawOutline: function(ct) {
			if(this.rect)
			{
				ct.beginPath()
				ct.strokeStyle = "blue"
				ct.globalAlpha = 1
				ct.lineWidth = 2

				shape.draw(this.rect, ct)

				ct.stroke();
			}
		},
		onDrop: function(x,y) {
			if(this.rect != null)
			{
				const off =  vsub(tile(mousepos), tile(selection.pos))
				maphub.moveAll(...shape.expand(this.rect), off.x, off.y);
				this.reset();
			}
			else if(selection.pos.x != mousepos.x || selection.pos.y != mousepos.y)
			{
				//const b = vbounds(tile(selection.pos), tile(mousepos))
				//this.rect = shape.new("mask", b.min, vadd(b.max, 1))
				this.rect = shape.new("mask", tile(selection.pos), tile(mousepos))

				layers.token.draw();
				this.hasRuler = true;
				this.tokenColor = "gray"
			}
		},
		onPickup: function() {
			layers.token.draw()
		},
		// Revert the mask state to initial values
		reset : function() {
			if(this.rect)
			{
				this.rect = null;
				this.hasRuler = false;
				this.tokenColor = "blue";
				layers.token.draw();
			}
		},
		delete: function() {
			if(this.rect)
				maphub.removeAll(...shape.expand(this.rect))
		},
		tokenColor: "blue"
	},
	circle: {
		hasRuler: true,
		circ: null,
		specialRuler: function() {
			if(!this.circ)
				return shape.circle.radius(this.getCircle()) * 5;
		},
		isSelected: function(tk) {
			return this.circ != null
				&& shape.containsToken(this.circ, tk)	
			//&& tokenInCircle(tk, this.circ.x, this.circ.y, this.circ.r);
		},
		getCursor: function() {
			return this.circ ? "grabbing" : "default";
		},
		draw: function(ct) {
			if(this.circ)
			{
				for(let tk of map.tokens)
				{
					if(!this.isSelected(tk))
						continue;

					ct.putToken(tk, mousepos.x + tk.X * cellSize - selection.pos.x,
						mousepos.y + tk.Y * cellSize - selection.pos.y);
				}
			}
			else
			{
				ct.beginPath();
				ct.globalAlpha = 0.6
				ct.strokeStyle = "blue"
				ct.fillStyle = "lightblue"
				ct.lineWidth = 2
				shape.draw(this.getCircle(), ct)

				ct.fill();
				ct.stroke();
			}
		},
		drawOutline: function(ct) {
			if(this.circ)
			{
				ct.beginPath()
				ct.strokeStyle = "blue"
				ct.globalAlpha = 1
				ct.lineWidth = 2

				shape.draw(this.circ, ct)

				ct.stroke();
			}
		},
		getCircle: function() {

			return this.circ ?? shape.new("circle", rtile(selection.pos), rtile(mousepos))

//			return { x: cX, y: cY,
//				r: Math.round(Math.sqrt(Math.pow(cX - xe / cellSize, 2) + Math.pow(cY - ye / cellSize, 2))) }
		},
		onDrop: function(x,y) {
			if(this.circ != null)
			{
				const off =  vsub(tile(mousepos), tile(selection.pos))
				maphub.moveAll(...shape.expand(this.circ), off.x, off.y);

				this.reset();
			}
			else if(selection.pos.x != mousepos.x || selection.pos.y != mousepos.y)
			{
				this.circ = this.getCircle(selection.pos.x, selection.pos.y, x, y)

				if(shape.circle.radius(this.circ) == 0)
				{
					this.reset()
					return;
				}

				layers.token.draw();
				this.tokenColor = "gray"
				layers.special.draw();
			}
		},
		onPickup: function() {
			layers.token.draw()
		},
		reset: function() {
			if(this.circ)
			{
				this.circ = null;
				this.tokenColor = "blue";
				layers.token.draw();
			}
		},
		tokenColor: "blue"
	},
	shape: {
		tool: toolbox.tools.shapes,
		shape: null,
		enableSpecialRuler: true,
		isSelected: function(tk) {
			return this.shape && shape.containsToken(this.shape, tk);
		},
		specialRuler: function() {
			if(this.shape === null)
				return shape["circle"].radius(this.getShape()) * 5;
		},
		getKind : function() { return this.tool.selection.value; },
		getShape: function() { 
			if(this.shape)
				return this.shape
			
			const k = this.getKind()

			if(shape[k].vertexCentered)
				return shape.new(k, rtile(selection.pos), rtile(mousepos))
			else
				return shape.new(k, tile(selection.pos), tile(mousepos))
		},
		hasRuler: true,
		tokenColor: "blue",
		getCursor: function() {
			return this.shape ? "grabbing" : "default";
		},
		draw: function(ct) {
			if(this.shape)
			{
				for(let tk of map.tokens)
				{
					if(!shape.containsToken(this.shape, tk))
						continue;

					ct.putToken(tk, mousepos.x + tk.X * cellSize - selection.pos.x,
						mousepos.y + tk.Y * cellSize - selection.pos.y);
				}
			}
			else
			{
				ct.beginPath()
				ct.globalAlpha = 0.6
				ct.strokeStyle = "blue"
				ct.fillStyle = "lightblue"
				ct.lineWidth = 2

				shape.draw(this.getShape(), ct)

				ct.stroke();
				ct.fill();
			}
		},
		drawOutline: function(ct) {
			if(this.shape)
			{
				ct.beginPath()
				ct.strokeStyle = "blue"
				ct.globalAlpha = 1
				ct.lineWidth = 2

				shape.draw(this.shape, ct)

				ct.stroke();
			}
		},
		reset: function() {
			if(this.shape)
			{
				this.shape = null;
				this.tokenColor = "blue"
				layers.token.draw();
			}
		},
		onPickup: function() {
			layers.token.draw()
		},
		onDrop: function() {
			if(this.shape)
			{
				const off =  vsub(tile(mousepos), tile(selection.pos))
				maphub.moveAll(...shape.expand(this.shape), off.x, off.y);
				this.reset();
			}
			else if(selection.pos.x != mousepos.x || selection.pos.y != mousepos.y)
			{

				this.shape = this.getShape()
				layers.token.draw();
				this.tokenColor = "gray"
			}
		}
	},
	select: {
		kind: "mask",
		shape: null,
		enableSpecialRuler: true,
		isSelected: function(tk) {
			return this.shape && shape.containsToken(this.shape, tk);
		},
		specialRuler: function() {
			if(this.shape === null)
				return shape["circle"].radius(this.getShape()) * 5;
		},
		getShape: function() { 
			if(this.shape)
				return this.shape
			
			if(shape[this.kind].vertexCentered)
				return shape.new(this.kind, rtile(selection.pos), rtile(mousepos))
			else
				return shape.new(this.kind, tile(selection.pos), tile(mousepos))
		},
		hasRuler: true,
		tokenColor: "blue",
		getCursor: function() {
			return this.shape ? "grabbing" : "default";
		},
		draw: function(ct) {
			if(this.shape)
			{
				for(let tk of map.tokens)
				{
					if(!shape.containsToken(this.shape, tk))
						continue;

					ct.putToken(tk, mousepos.x + tk.X * cellSize - selection.pos.x,
						mousepos.y + tk.Y * cellSize - selection.pos.y);
				}
			}
			else
			{
				ct.beginPath()
				ct.globalAlpha = 0.6
				ct.strokeStyle = "blue"
				ct.fillStyle = "lightblue"
				ct.lineWidth = 2

				shape.draw(this.getShape(), ct)

				ct.stroke();
				ct.fill();
			}
		},
		drawOutline: function(ct) {
			if(this.shape)
			{
				ct.beginPath()
				ct.strokeStyle = "blue"
				ct.globalAlpha = 1
				ct.lineWidth = 2

				shape.draw(this.shape, ct)

				ct.stroke();
			}
		},
		reset: function() {
			if(this.shape)
			{
				this.shape = null;
				this.tokenColor = "blue"
				layers.token.draw();
			}
		},
		onPickup: function() {
			layers.token.draw()
		},
		onDrop: function() {
			if(this.shape)
			{
				const off =  vsub(tile(mousepos), tile(selection.pos))
				maphub.moveAll(...shape.expand(this.shape), off.x, off.y);
				this.reset();
			}
			else if(selection.pos.x != mousepos.x || selection.pos.y != mousepos.y)
			{

				this.shape = this.getShape()
				layers.token.draw();
				this.tokenColor = "gray"
			}
		}
	},
	spawnzone: {
		onDrop: function() {
			maphub.setSpawnZone(tile(selection.pos.x), tile(selection.pos.y), tile(mousepos.x), tile(mousepos.y))
		},
		draw: function(ct) {
			const dx = mousepos.x - selection.pos.x
			const dy = mousepos.y - selection.pos.y

			ct.beginPath()
			ct.globalAlpha = 0.4
			ct.strokeStyle = "gold"
			ct.fillStyle = "yellow"
			ct.lineWidth = 2

			ct.fillRect(selection.pos.x, selection.pos.y, dx, dy)
			ct.rect(selection.pos.x, selection.pos.y, dx, dy);
			ct.stroke();
		}
	}
}

// Contains the event Handlers
const handlers = {
	/* Redraws hovering token and ruler length display */
	onMouseMove : function(evnt)
	{
		if(toolbox.activeTool == toolbox.tools.tileedit &&
			(tile(mousepos.x) != tile(evnt.pageX) || tile(mousepos.y) != tile(evnt.pageY)))
			toolbox.tools.tileedit.onMouseDown(evnt)

		oldmousepos = mousepos
		mousepos = { x: evnt.pageX, y: evnt.pageY }
		layers.special.draw()

		if(selection.current.hasRuler)
			rulerDisplay.update();
	},
	/* Picks up a token or anchors a ruler */
	onCanvasMouseDown: function(evnt)
	{
		mousepos = { x: evnt.pageX, y: evnt.pageY }

		const cur = selection.current

		toolbox.activeTool.onMouseDown(evnt);
		canvasStyle.cursor = toolbox.activeTool.getCursor();

		if(selection.current != null)
		{
			selection.last = cur
			selection.pos = mousepos
			document.onmousemove = handlers.onMouseMove

			for (const s in selection) {
				if(selection[s] && selection[s].reset && selection[s] != selection.current)
					selection[s].reset()
			}

			if(selection.current.onPickup)
				selection.current.onPickup();

			layers.special.draw();

			if(selection.current.hasRuler)
			{
				rulerDisplay.enable();
				rulerDisplay.update();
			}
		}
		
	},
	/* Moves the held token or removes the ruler */
	onCanvasMouseUp: function(evnt)
	{
		const sel = selection.current;

		document.onmousemove = null
		rulerDisplay.disable();

		if(sel != null)
		{
			selection.last = selection.current
			selection.current = null
			sel.onDrop(evnt.pageX, evnt.pageY);
			layers.special.draw();
		}

		canvasStyle.cursor = toolbox.activeTool.getCursor();
	},
	/* Blinks a token */
	onCanvasDoubleClick: function(evnt)
	{
		const cX = tile(evnt.pageX)
		const cY = tile(evnt.pageY)
		const tk = tokenAt(cX, cY)

		if(typeof toolbox.activeTool?.dontBlink !== "undefined")
			return;
		if(tk && (!tk.Hidden || isDM))
			maphub.blink(blinkKind.token, tk.X, tk.Y);
		else
			maphub.blink(blinkKind.tile, cX, cY);
	},
	onCanvasDrop: function(ev)
	{
		function getfile(callback)
		{
			if(ev.dataTransfer == null)
			{
				console.error("Error: Drop: DataTransfer is null");
				return;
			}
			if(ev.dataTransfer.files && ev.dataTransfer.files.length)
			{
				if(ev.dataTransfer.files.length != 1)
				{
					console.error("Error: Drop: Via Files: Expected exactly 1 item")
					return;
				}
				if(!ev.dataTransfer.files[0].type.startsWith("image/"))
				{
					console.error("Error: Drop: Via Files: Expeted Image");
					return;
				}

				return callback(ev.dataTransfer.files[0]);
			}
			else if (ev.dataTransfer.items && ev.dataTransfer.items.length)
			{
				const img = ev.dataTransfer.types.findIndex(i => i.startsWith("image/"))

				if(img >= 0)
				{
					const file = ev.dataTransfer.items[img].getAsFile()

					if(file.size > 1024*1024)
					{
						console.error("Error: Drop: Via Items: Image over 1MB in size");
						return;
					}

					return callback(file);
				}

				const html = ev.dataTransfer.types.indexOf("text/html");

				if(html < 0)
				{
					console.error("Error: Drop: From items: No suitable items found.");
					return;
				}

				if(ev.dataTransfer.types.indexOf("text/html", html + 1) >= 0)
				{
					console.error("Error: Drop: From items: Multiple HTML items found.");
					return;
				}

				const e = ev.dataTransfer.items[html];

				if(e.kind !== "string")
				{
					console.error("Error: Drop: From items: Expected HTML string, not file");
					return;
				}

				e.getAsString(str => {
					const dom = document.createElement("html");
					dom.innerHTML = str;
					const images = dom.getElementsByTagName("img");

					console.error(images)

					if(images.length == 0)
					{
						console.error("Error: Drop: From items: From HTML: No images given");
						return;
					}
					/*if(images.length > 1)
					{
						console.log("Error: Drop: From items: From HTML: Too many images given");
						return;	
					}*/

					return callback(images[images.length - 1].src);
				})
			}
			else
			{
				console.error("Error: Drop: Neither items nor files found");
				return;
			}
		}

		ev.preventDefault();

		const tk = tokenAt(tile(ev.pageX), tile(ev.pageY))

		if(tk == null)
		{
			console.error("Error: Drop: No token")
			return;
		}

		getfile(f => {
			mapInterface.uploadImage(idName(tk), f)
		});
	
	},
	onCanvasDragover: function(evnt)
	{
		// Prevent opening the file
		evnt.preventDefault();
	},
	onKeyDown: function(evnt)
	{
		switch(evnt.code)
		{
			case "Escape":
				if(toolbox.enabled)
				{
					if(toolbox.activeTool === toolbox.tools.cursor)
					{
						for (const key in selection) {
							if(selection[key] && typeof selection[key] === "object" && selection[key].reset)
								selection[key].reset();
						}
						layers.special.draw();
					}
					else
						toolbox.tools.cursor.button.click();
				}
			break;

			case "Delete":
				if(toolbox.activeTool == toolbox.tools.spawnzone)
					maphub.setSpawnZone(-1, -1, -1, -1);
				else if(isDM)
				{
					const s = selection.getShape()

					if(s)
						maphub.removeAll(...shape.expand(s))
				}
			break;

			case "KeyH":
			{
				const s = selection.getShape()

				if(s)
					maphub.blinkShape(...shape.expand(s))
			}
			break;

			case "KeyE":
			{
				const s = selection.getShape()

				if(s)
					effects.onBlinkShape(s)
			}
			break
		}
	}
}

/* Handles outside interaction with the UI */
const uiInterface = {
	init: function() {
		const s = document.getElementById("canvas_stack");
		s.addEventListener("mousedown", handlers.onCanvasMouseDown);
		s.addEventListener("mouseup", handlers.onCanvasMouseUp);
		s.addEventListener("dblclick", handlers.onCanvasDoubleClick);
		s.addEventListener("drop", handlers.onCanvasDrop);
		s.addEventListener("dragover", handlers.onCanvasDragover);
	
		document.body.addEventListener("keydown", handlers.onKeyDown)
		
		toolbox.init();
	},

	/* Reacts to changes in the map datastructure. Called by maphub. */
	onMapUpdate: function(fieldIds) {
		if((fieldIds & mapFields.sqrt2) && toolbox.enabled)
		{
			toolbox.tools.settings.Denom.value = map.sqrt2denom
			toolbox.tools.settings.Num.value = map.sqrt2num
		}
		if(fieldIds & mapFields.effects)
			effects.onEffectUpdate()

		if(fieldIds & mapFields.spawn && toolbox.activeTool == toolbox.tools.spawnzone)
			layers.special.draw()
	},

	/* Reacts to highlighed shape. Called by maphub. */
	onBlinkShape: function(s) {
		effects.onBlinkShape(s);
	},

	/* Returns the text and border color for the given token. Called from the token layer. */
	getTokenColor: function(token) {
		if(selection.current?.isSelected && selection.current.isSelected(token))
			return selection.current.tokenColor;

		return "black"
	},

	draw: function(ct) {
		ct.clear();

		if(toolbox.activeTool?.draw)
		{
			ct.save();
			toolbox.activeTool.draw(ct);
			ct.restore();
		}

		if(selection.current != null)
		{
			ct.save();
			selection.current.draw(ct);
			ct.restore();
		}
		else if(selection.last?.drawOutline)
		{
			selection.last.drawOutline(ct)
		}
	}
}