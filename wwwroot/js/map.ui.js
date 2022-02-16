"use strict";

//#region JSDoc typedefs
/** @typedef {Object} tool
 * @property {boolean=}	pinnable		Indicates that shift-clicking on the tool's icon should pin its window to the upper left
 * @property {boolean=} dontBlink		Disables token and tile blinking while the tool is active
 * @property {function=} onMouseDown	Hooks the onmousedown event while the tool is active
 * @property {function=} getCursor		Gets the HTML cursor the tool uses
 * @property {function=} onSelect		Called when the tool becomes active
 * @property {function=} onPutAway		Called when the tool becomes no longer active
 * @property {function=} init			Called after toolbox.init
 * @property {function=} draw			Called by uiInterface.draw if the tool is active or pinned
 * @property {?HTMLElement}	button		The HTML button used to activate this tool. null if the tool isn't loaded
 * @property {?HTMLElement}	window		The window for this tool. Automatically unhidden if it is extant and the tool is selected
 */


/** @typedef {Object} effect
 * @property {shape} shape		The effect's shape
 * @property {number} color		The effect's color
 * @property {?boolean} local	Whether or not the effect is local or persistent
 */

 /** @typedef {Object} selection
  * @property {?boolean} hasRuler	Determines if the ruler is shown while the selection is active
  * @property {!function} draw		Called by uiInterface.draw while the selection is active
  * @property {function=} onPickup	Called when the selection becomes active
  * @property {!function} onDrop		Called when the selection becomes no longer active
  * @property {!function} getCursor	Returns the cursor shown while using the selection
  * @property {function=} drawOutline	Called by uiInterface.draw if the selection is the last one used
  * @property {function=} isSelected	Determines if a token is selected by the selection. If defined, tokenColor must be defined too
  * @property {string=} tokenColor		The color for selected tokens (as determined by isSelected)
  * @property {function=} specialRuler	Implements a special distance function for the ruler
  */
//#endregion

/** The mouse position after the current move event
 * @type {?vec2}
 */
var mousePos;

/** Used as placeholder in toolbox.tools, automatically replaced by toolbox.init
 * @constant
*/
const initpls = "_initpls_";

var canvasStyle = document.getElementById("canvas_stack").style;

/** Handles the toolbox
 * @constant
 */
const toolbox = {
	div: document.getElementById("toolbox"),
	pinned: null,
	/** Contains the tools
	 * @constant {Object.<string, tool>}  */
	tools : {
		/**@constant {tool} */
		cursor: {
			pinnable: true,
			/**@param {MouseEvent} evnt
			 * @returns {void} nothing
			 */
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
				else if(tk == null || (!isDM && isHidden(tk)))
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
		/**@constant {tool} */
		addtoken: {
			/**@type {HTMLElement} */
			Name: initpls,
			/**@type {HTMLElement} */
			Width: initpls,
			/**@type {HTMLElement} */
			Height: initpls,
			/**@type {HTMLElement} */
			Num: initpls,
			name: "",
			num: 1,
			dontBlink: true,
			/**@param {MouseEvent} evnt
			 * @returns {void} nothing
			 */
			onMouseDown: function(evnt) {
				const tk = tokenAt(tile(evnt.pageX), tile(evnt.pageY))

				if(evnt.ctrlKey && tk)
				{
					const spl = tk.Name.split('\n');

					this.Name.value = spl[0]
					this.Num.value = (spl.length > 1) ? parseInt(spl[1].substring(1)) : 1;
				}
				else if(tk)
					console.log("Refusing addToken on top of token");
				else if(evnt.shiftKey)
				{
					let num = parseInt(this.Num.value)
					maphub.addToken({ Name: this.Name.value + "\n#" + num++, X: tile(evnt.pageX), Y: tile(evnt.pageY),
						Width: parseInt(this.Width.value), Height: parseInt(this.Height.value)})
					this.Num.value = num;
				}
				else
				{
					maphub.addToken({ Name: this.Name.value, X: tile(evnt.pageX), Y: tile(evnt.pageY),
						Width: parseInt(this.Width.value), Height: parseInt(this.Height.value)})

					//toolbox.tools.cursor.button.click();
				}
			},
			getCursor: function() {
				return "copy";
			},
		},
		/**@constant {tool} */
		removetoken: {
			dontBlink: true,
			/**@param {MouseEvent} evnt
			 * @returns {void} nothing
			 */
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
					maphub.removeAll(shape.point(tile(v(evnt.pageX, evnt.pageY))))
			},
			getCursor: function() {
				return "crosshair";
			}
		},
		/**@constant {tool} */
		tileedit: {
			dontBlink: true,
			/**@type {HTMLElement} */
			Color: initpls,
			/**@param {MouseEvent} evnt
			 * @returns {void} nothing
			 */
			onMouseDown: function(evnt) {
				if(evnt.ctrlKey)
					selection.current = selection.fill
				else if(evnt.shiftKey)
					this.Color.value = hexColor(map.colors[tile(evnt.pageX)][tile(evnt.pageY)])
				else
				{
					maphub.color(tile(evnt.pageX), tile(evnt.pageY), parseInt(this.Color.value.substring(1), 16))
					document.onmousemove = function(evnt) {
						const cX = tile(evnt.pageX)
						const cY = tile(evnt.pageY)

						if(tile(mousePos.x) != cX || tile(mousePos.y) != cY)
							maphub.color(cX, cY, parseInt(toolbox.tools.tileedit.Color.value.substring(1), 16))

						mousePos = { x: evnt.pageX, y: evnt.pageY }
					}
				}
			},
			getCursor: function() {
				return "default";
			}
		},
		/**@constant {tool} */
		resize: {
			pinnable: true,
			/**@type {HTMLElement} */
			left: initpls,
			/**@type {HTMLElement} */
			right: initpls,
			/**@type {HTMLElement} */
			up: initpls,
			/**@type {HTMLElement} */
			down: initpls,
			/**@type {HTMLElement} */
			error: initpls,
			/**@type {HTMLElement} */
			savebutton: initpls,
			force: false,
			/** Called on number input, checks for invalid values and resets them.
			 * @param {'left'|'right'|'up'|down} dir
			 * @returns {void} nothing
			 */
			onInput: function(dir) {
				if(((dir == "left" || dir == "right") && parseInt(this.left.value) + parseInt(this.right.value) < -map.width)
					|| ((dir == "up" || dir == "down") && parseInt(this.up.value) + parseInt(this.down.value) < -map.height))
				{
					this[dir].value++
					return;
				}

				this.reset()
			},
			reset: function() {
				this.error.hide()
				this.force = false
				this.savebutton.innerText = "Save"
				layers.special.draw();
			},
			/** Enacts a map resize.
			 * @throws {string} If the resize would cut off tokens
			 * @param {number} left
			 * @param {number} right
			 * @param {number} up
			 * @param {number} down
			 * @param {boolean} force
			 */
			resize: function(left,right,up,down,force)
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
			},
			save: function() {
				const l = parseInt(this.left.value)
				const r = parseInt(this.right.value)
				const u = parseInt(this.up.value)
				const d = parseInt(this.down.value)

				//console.log(`Resize: ${l} ${r}: ${u} ${d}`);

				try
				{
					this.resize(l,r,u,d, this.force);
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
			/**@param {CanvasRenderingContext2D} ct
			 * @returns {void} nothing
			 */
			draw: function(ct) {
				ct.globalAlpha = 0.5
				ct.fillStyle = "red"
				const l = Math.min(map.width, Math.max(0, -parseInt(toolbox.tools.resize.left.value)))
				const r = Math.min(map.width, Math.max(0, -parseInt(toolbox.tools.resize.right.value)))
				const u = Math.min(map.height, Math.max(0, -parseInt(toolbox.tools.resize.up.value)))
				const d = Math.min(map.height, Math.max(0, -parseInt(toolbox.tools.resize.down.value)))

				if(l)
					ct.fillRect(...cc(0, u, l, map.height))
				if(u)
					ct.fillRect(...cc(0, 0, map.width - r, u))
				if(r)
					ct.fillRect(...cc(map.width - r, 0, r, map.height - d))
				if(d)
					ct.fillRect(...cc(l, map.height - d, map.width, d))

				return 1;
			}
		},
		/**@constant {tool} */
		effects: {
			pinnable: true,
			/** Generates a HTML element representing an effect
			 * @param {effect} item The effect
			 * @returns {HTMLElement}
			 */
			genDiv: function(item) {
				let div = document.createElement("div");
				let name = document.createElement("span")

				const diff = vsub(item.shape.end, item.shape.start)

				if(item.shape.kind === "mask")
					name.innerText = `${Math.abs(diff.x) + 1}x${Math.abs(diff.y) + 1} rectangle`;
				else
					name.innerText = `${rulerDisplay.format(Math.round(vlen(diff)))} ${item.shape.kind}`

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
			/** Rebuilds the effects window
			 * @returns {void} nothing
			 */
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
		/**@constant {tool} */
		shapes: {
			/**@type {HTMLElement} */
			selection: initpls,
			/**@param {MouseEvent} e
			 * @returns {void} nothing
			 */
			onMouseDown: function(e) {
				const tk = tokenAt(tile(e.pageX), tile(e.pageY))

				if(selection.shape.shape && (!tk || !selection.shape.isSelected(tk)))
					selection.shape.reset();

				selection.current = selection.shape
			},
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
		/**@constant {tool} */
		dice: {
			pinnable: true,
			pips: [ 2, 4, 6, 8, 10, 12, 20, 100 ],
			/** Rolls the given die and updates the window's list and totals
			 * @param {number} p The die's pips
			 * @returns {void} nothing
			 */
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
			},
			/** Deletes the rolls of the given dice and updates totals
			 * @param {number} p The die's pips
			 * @returns {void} nothing
			 */
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
			/** Deletes all rolls.
			 * @returns {void} nothing
			 */
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
					dn.classList.add("clickable")
					dn.onclick = () => { toolbox.tools.dice.roll(p) }
					dn.setAttribute("id", `dice_d${p}_name`)
					span.appendChild(dn);

					const del = document.createElement("span");
					del.innerText = "🗑️";
					del.classList.add("clickable")
					del.onclick = () => { toolbox.tools.dice.del(p) }
					span.appendChild(del);

					const total = document.createElement("span");
					total.setAttribute("id", `dice_d${p}_total`)
					span.appendChild(total);

					die.appendChild(span);

					const numbers = document.createElement("span");
					numbers.setAttribute("id", `dice_d${p}_numbers`)
					numbers.classList.add("clickable")
					numbers.onclick = () => { toolbox.tools.dice.roll(p) }
					die.appendChild(numbers);

					die.classList.add("noselect")
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
		/**@constant {tool} */
		hide: {
			dontBlink: true,
			/**@param {MouseEvent} evnt
			 * @returns {void} nothing
			 */
			onMouseDown: function(evnt) {
				const tk = tokenAt(tile(evnt.pageX), tile(evnt.pageY))

				if(tk)
					maphub.modifyTokens(shape.point(tk.X, tk.Y), { hidden: !isHidden(tk) });
			},
			getCursor: function() { return "help" },
		},
		/**@constant {tool} */
		settings: {
			pinnable: true,
			Denom: document.getElementById("setting_sqrt2_denom"),
			Num: document.getElementById("setting_sqrt2_num"),
			Unit: document.getElementById("setting_dist_unit"),
			/** Sends the current settings to the server */
			save: function() {
				maphub.settings({
					Sqrt2Denominator: parseInt(this.Denom.value),
					Sqrt2Numerator: parseInt(this.Num.value),
					DistanceUnit: this.Unit.value })
			},
			update: function() {
				this.Denom.value = map.settings.Sqrt2Denominator
				this.Num.value = map.settings.Sqrt2Numerator
				this.Unit.value = map.settings.DistanceUnit
			}
		},
		/**@constant {tool} */
		spawnzone: {
			dontBlink: true,
			onSelect: function() {
				layers.special.draw();
			},
			onMouseDown: function() {
				selection.current = selection.spawnzone;
			},
			/**@param {CanvasRenderingContext2D} ct
			 * @returns {void} nothing
			 */
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
		},
		/**@constant {tool} */
		debug: {
			pinnable: true,
			/**@type {HTMLElement} */
			save: initpls,
			/**@type {HTMLElement} */
			debug: initpls,
			/**@type {HTMLElement} */
			resync: initpls,
			/**@type {HTMLElement} */
			redraw: initpls,
			onSave: function() {
				maphub.connection.invoke("Save");
			},
			onDebug: function() {
				maphub.debug();
			},
			onResync: function() {
				maphub.resync(mapFields.all);
			},
			onRedraw: function() {
				for (const l in layers) {
					layers[l].draw();
				}
			},
			init: function() {
				this.save.onclick = this.onSave;
				this.debug.onclick = this.onDebug;
				this.resync.onclick = this.onResync;
				this.redraw.onclick = this.onRedraw;
			}
		},
		/**@constant {tool} */
		initiative: {
			/**
			 * @typedef {HTMLElement & initEntryData_t} initEntry_t
			 * @typedef {Object} initEntryData_t
			 * @property {number} initCount	The initiative count for the entry
			 * @property {token} token	The token
			*/

			/**@type {HTMLElement} */
			list: initpls,
			/**@type {HTMLElement} */
			mod: initpls,
			/**@type {HTMLElement} */
			nextbutton: initpls,
			pinnable: true,
			/**@type {initEntry_t?} */
			cur: null,
			/** Sorts the initiative list.
			 * @returns {void} nothing
			*/
			sort: function() {
				/**@type {initEntry_t[]} */
				let ls = [];

				while(this.list.hasChildNodes())
				{
					const c = this.list.firstChild;
					ls.push(c);
					this.list.removeChild(c);
				}

				ls.sort((l,r) => r.initCount - l.initCount);

				for (const i of ls) {
					this.list.appendChild(i);
				}
			},
			/** Sets the current token
			 * @param {initEntry_t} li
			 * @param {*} dontBlink
			 */
			setCur: function(li, dontBlink) {
				if(this.cur)
					this.cur.style.fontWeight = "inherit"

				this.cur = li

				if(this.cur)
				{
					this.cur.style.fontWeight = "bold"

					if(!dontBlink)
						maphub.blink(blinkKind.initiative, li.token.X, li.token.Y);
				}
			},
			/** Advances to next token */
			next: function() {
				this.setCur(this.cur?.nextSibling ?? this.list.firstChild)
			},
			/** Called on update of initiative entry
			 * @param {initEntry_t} li */
			update: function(li) {
				li.initCount = parseInt(li.lastChild.value);
				this.sort();
				li.lastChild.focus();
			},
			/** Adds a token to the initiative list
			 * @param {token} tk The token
			 * @param {number} count Its initiative count
			 */
			addLi: function(tk, count) {
				const li = document.createElement("li");
				li.token = tk;
				li.initCount = count;

				const txt = document.createElement("span");
				txt.innerText = flatName(tk);
				txt.classList.add("clickable")
				txt.onclick = function(ev) {
					toolbox.tools.initiative.onClick(li, ev);
				}

				li.appendChild(txt);

				const num = document.createElement("input");
				num.type = "number";
				num.max = 99;
				num.min = -99;
				num.size = 3;
				num.oninput = function(ev) {
					toolbox.tools.initiative.update(li, ev);
				}

				if(count > -100)
					num.value = li.initCount
				else
					num.placeholder = "--"

				li.appendChild(num);
				this.list.appendChild(li);
			},
			/** Inserts a token, optionally rolling its initiative automatically.
			 * @param {token} tk The token
			 * @param {boolean} genIc Whether or not to roll its initiative
			 */
			insert: function(tk, genIc) {
				for (const c of this.list.children) {
					if(c.token === tk)
						return;
				}
				let roll = Math.floor(Math.random() * 20) + 1
				let count = (!genIc) ? -100 : (roll === 20) ? 99 : (roll === 1) ? -99 : (roll + parseInt(this.mod.value));

				this.addLi(tk, count)
				this.sort();
			},
			/** Handles clicks on list entries
			 * @param {initEntry_t} li
			 * @param {MouseEvent} ev */
			onClick: function(li, ev) {
				if(ev.shiftKey) // Remove item
					this.list.removeChild(li);
				else
					this.setCur(li);
			},
			/** @param {MouseEvent} evnt */
			onMouseDown: function(evnt) {
				const tk = tokenAt(tile(evnt.pageX), tile(evnt.pageY))

				if(tk)
					this.insert(tk, !evnt.shiftKey);
			},
			clearList: function() {
				while(this.list.hasChildNodes())
					this.list.removeChild(this.list.firstChild)
			},
			onMapUpdate: function(isResync) {
				if(isResync)
				{
					const data = this.cookieData();
					this.clearList();
					this.load(data)
				}
				else
				{
					for (let li = this.list.firstChild; li; li = li.nextSibling) {
						if(map.tokens.indexOf(li.token) == -1)
							this.list.removeChild(li);
					}
				}
			},
			init: function() {
				mapUpdateHooks.push({ mask: mapFields.tokens, callback: function(f,r) { toolbox.tools.initiative.onMapUpdate(r) } })
				cookie.onStoreCallbacks.push(this.onStore.bind(this));

				this.nextbutton.onclick = this.next.bind(this);

				try
				{
					if(cookie.data.initiative)
						this.load(cookie.data.initiative);
				}
				catch(ex)
				{
					console.error("Failed loading initiative order from ", cookie.data.initiative, ex);
				}
			},
			/** Loads cookie data at page load
			 * @param {initEntry_t[]} obj The cookie's initiative field
			 */
			load: function(obj) {
				const _tokens = map.tokens.map(JSON.stringify);

				for (let k = 0; k < obj.length; k++) {
					let eqi = _tokens.indexOf(JSON.stringify(obj[k].token));

					if(eqi == -1)
					{
						// Attempt to recover from moved token
						let sameName =  map.tokens.filter(tk => tk.Name == obj[k].token.Name);

						if(sameName.length == 1)
							eqi = map.tokens.indexOf(sameName[0]);
						else
						{
							console.error("Cannot find token for entry from old initiative list:", obj[k]);
							continue;
						}
					}

					obj[k].token = map.tokens[eqi]
				}

				for (const i of obj) {
					this.addLi(i.token, i.initCount);

					if(i.cur)
						this.setCur(this.list.lastChild, true);
				}

				this.sort();
			},
			cookieData: function() {
				let data  = []

				for(const c of this.list.children)
				{
					let co = { token: c.token, initCount: c.initCount };

					if(this.cur == c)
						co.cur = true;

					data.push(co);
				}

				return data
			},
			/** Stores cookie data, called before tab close. */
			onStore: function() {
				cookie.data.initiative = this.cookieData();
			}
		},
		/**@constant {tool} */
		rtx: {
			pinnable: true,
			/** The table of light sources. Organized Token, Range, Brightness
			 * @type {HTMLTableElement} */
			sources: initpls,
			/** The table of opaque tiles. Organized hex, example
			 * @type {HTMLTableElement} */
			opaque: initpls,
			/** @type {HTMLSelectElement} */
			globallight: initpls,
			/** @type {HTMLInputElement} */
			hidehidden: initpls,
			/** @type {HTMLInputElement} */
			lineofsight: initpls,
			/** @type {HTMLInputElement} */
			floodfill: initpls,
			/** @type {HTMLButtonElement} */
			save: initpls,
			/** @type {HTMLInputElement} */
			preview: initpls,
			clear: function() {
				function clearTable(t) {
					for(;;)
					{
						const c = t.firstChild;

						if(c == null)
							return;

						t.removeChild(c)
					}
				}
				clearTable(this.sources)
				clearTable(this.opaque)
			},
			makeColorRow: function(color) {
				const ex = document.createElement("td")

				ex.innerText = "■"
				ex.style.color = colorString(color)

				addRow(this.opaque, [hexColor(color), ex], null)
			},
			/** Populates the tables with the given rtx info
			 * @param {rtxinfo} data
			 */
			fill: function(data) {
				if(typeof data !== "object")
					return;

				for (const tkID in data.sources) {
					const e = data.sources[tkID]
					addRow(this.sources, [tkID, e.range, e.level], null)
				}
				for (const color of data.opaque) {
					this.makeColorRow(color)
				}

				this.globallight.value = data.globallight
				this.hidehidden.checked = data.hideHidden ?? false
				this.lineofsight.checked = data.lineOfSight ?? false
				this.floodfill.checked = data.floodFill ?? false
			},
			getSources: function() {
				let s = {};

				for (const source of this.sources.childNodes)
				{
					const cells = new Array(... source.childNodes).map(d => d.innerText)
					s[cells[0]] = { range: Number(cells[1]), level: Number(cells[2]) }
				}

				return s;
			},
			getOpaque: function() {
				return new Array(...this.opaque.childNodes)
					.map(tr => parseColor(tr.firstChild.innerText));
			},
			getData: function() {
				return {
					sources: this.getSources(),
					opaque: this.getOpaque(),
					globallight: Number(this.globallight.value),
					hideHidden: this.hidehidden.checked,
					lineOfSight: this.lineofsight.checked,
					floodFill: this.floodfill.checked,
				};
			},
			onSave: function(evnt) {
				maphub.rtxUpdate(toolbox.tools.rtx.getData())
			},
			onPreview: function() {
				rtxInterface.enabled = toolbox.tools.rtx.preview.checked
				layers.shadow.draw()
			},
			onMouseDown: function(evnt) {
				const p = v(tile(evnt.pageX), tile(evnt.pageY))
				const tk = tokenAt(p.x, p.y)
				// TODO: rework UI

				if(tk)
				{
					const id = idName(tk);

					if(!this.getSources()[id])
						addRow(this.sources, [idName(tk), 6, 2], null).contentEditable = true
				}
				else
				{
					const c = map.colors[p.x][p.y]

					if(!this.getOpaque().includes(c))
						this.makeColorRow(c)
				}
			},
			init: function() {
				this.save.onclick = this.onSave
				this.preview.onchange = this.onPreview
				this.fill(map.rtxInfo)

				mapUpdateHooks.push({ mask: mapFields.rtxInfo, callback: () => {
					toolbox.tools.rtx.clear();
					toolbox.tools.rtx.fill(map.rtxInfo);
				} })
			}
		},
		/**@constant {tool} */
		character: {
			pinnable: true,
			/** @type {HTMLInputElement} */
			darkvision: initpls,
			save: initpls,
			storeCookie: function() {
				cookie.data.character = {
					darkvision: Number(this.darkvision.value)
				};
			},
			onChange: function(evnt) {
				this.storeCookie()
				rtxInterface.onMapUpdate(mapFields.rtxInfo);
			},
			init: function() {
				this.darkvision.onchange = this.onChange.bind(this)
			}
		}
	},
	/** The currently selected tool
	 * @type {tool} */
	activeTool: null,
	init: function(){
		this.activeTool = this.tools.cursor

		for(let name in this.tools)
		{
			const tool = this.tools[name]
			tool.window = document.getElementById(name + "_window")
			tool.button = document.getElementById(name + "_button")

			if(tool.button == null)
				continue;

			tool.button.onclick = function(evnt){
				if(evnt.shiftKey && tool.pinnable)
				{ // pin
					if(toolbox.pinned)
					{
						const w  = toolbox.pinned.window
						w.classList.remove("tl");
						w.classList.add("br");
						w.hide();
					}

					if(tool !== toolbox.tools.cursor)
					{
						tool.window.unhide();
						tool.window.classList.remove("br");
						tool.window.classList.add("tl");
						toolbox.pinned = tool;
					}

					return;
				}

				if(toolbox.activeTool == tool)
					return;

				for(let name in toolbox.tools)
				{
					const t = toolbox.tools[name]

					if(t != tool && t.window != null && t != toolbox.pinned)
						t.window.hide()
				}


				canvasStyle.cursor = toolbox.getCursor(tool)

				if(tool.window != null)
					tool.window.unhide();

				const lTool = toolbox.activeTool

				toolbox.activeTool = tool

				if(lTool.onPutAway)
					lTool.onPutAway();
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
	},
	/** Gets the cursor of the current tool */
	getCursor: function(tool) {
		const _tool = tool ?? this.activeTool
		return ((_tool?.getCursor?.bind(_tool))
			?? (this.tools.cursor.getCursor.bind(this.tools.cursor)))();
	},
	/** Passes a mouseDown event to the relevant tool handler */
	onMouseDown: function(e) {
		// ignore RMB presses
		if(e.button === 2)
			return;

		return ((this.activeTool)?.onMouseDown?.bind(this.activeTool)
			?? this.tools.cursor.onMouseDown.bind(this.tools.cursor))(e);
	}
}

/** Handles visual effects */
const effects = {
	/** List of local effects
	 * @type {effect[]}
	 */
	list : [],
	preview: null,
	/** The effect tool
	 * @constant {tool}
	 */
	tool: toolbox.tools.effects,
	/** Pushed a local effect to persistent
	 * @returns {void}
	*/
	save: function(effect) {
		this.list.remove(effect)
		maphub.addEffect(effect)
	},
	/** Removes an effect. Handles both persistent and local effects.
	 * @param {effect} effect	The effect
	 * @returns {void}
	*/
	remove: function(effect) {
		if(effect.local)
		{
			this.list.remove(effect)
			this.onEffectUpdate()
		}
		else
			maphub.removeEffect(effect.shape)
	},
	/** Blinks an effect.
	 * @param {effect} effect	The effect
	 * @returns {void}
	*/
	blink: function(effect) {
		maphub.blinkShape(effect.shape)
	},
	/** Reacts to a blinkShape() command.
	 * @param {shape} s	The shape
	 * @returns {void}
	*/
	onBlinkShape: function(s) {
		if(this.list.some(e => shape.equal(e.shape,s)))
			return;

		this.list.push({ color:0, shape: s, local: true });
		this.onEffectUpdate()
	},
	/** Reacts to updates of map.effects
	 * @returns {void}
	*/
	onEffectUpdate: function() {
		if(this.tool.window)
			this.tool.onUpdate()
	}
}

/** Handles a ruler at the bottom left of the ui */
const rulerDisplay = {
	/** The element that displays measured distance
	 * @constant
	 * @type {HTMLElement}
	 */
	div: document.getElementById("distance"),
	/** Shows the ruler
	 * @returns {void}
	 */
	enable : function(){
		this.div.unhide()
	},
	/** Formats a distance value according to the unit setting */
	format: function(d) {
		const u = map.settings.DistanceUnit.trim();
		const s = Array.from(u).findIndex(c => c < '0' || c > '9')
		const mul = s < 1 ? 1 : parseInt(u.substring(0, s));
		const suf = s < 0 ? "" : u.substring(s);

		return `${d*mul}${suf}`
	},
	/** Reacts to updates in measures distance
	 * @returns {void}
	 */
	update : function(){
		let d = undefined;
		if(selection.current && selection.current.specialRuler)
			d = selection.current.specialRuler()
		if(d === undefined)
			d = dist(tile(selection.pos.x), tile(selection.pos.y), tile(mousePos.x), tile(mousePos.y));

		this.div.innerText = `📏 ${this.format(d)}`
	},
	/** Hides the ruler
	 * @returns {void}
	 */
	disable : function(){
		this.div.hide()
	}
}

/** Contains the selection tools that are used with the mouse */
const selection = {
	current: null,
	last: null,
	/** copy of mousePos at time of creation.
	 * @type {vec2}	In screen coordinates
	*/
	pos: null,
	getShape: function() {
		return this.mask.rect ?? this.circle.circ ?? this.select.shape ?? this.shape.shape;
	},
	token: {
		hasRuler: true,
		/** The selected token
		 * @type {token?}
		 */
		token: null,
		/** A canvas holding a copy of the token
		 * @type {HTMLCanvasElement}
		 */
		tkCanvas: null,
		offset: { x: 0, y: 0 },
		/**@param {CanvasRenderingContext2D} ctx */
		draw: function(ctx) {
			ctx.drawImage(this.tkCanvas, mousePos.x + this.offset.x, mousePos.y + this.offset.y);
		},
		onPickup: function() {
			const c = this.tkCanvas ?? document.createElement("canvas");
			c.width = cellSize * this.token.Width
			c.height = cellSize * this.token.Height

			//c.getContext("2d").putToken(this.token, 0, 0)

			/**
			 * @type {token}
			 */
			const tk = this.token;

			c.getContext("2d").drawImage(
				layers.token.canvas,
				...cc(tk.X, tk.Y,
				tk.Width, tk.Height,
				0, 0,
				tk.Width, tk.Height))

			mapInterface.redrawToken(this.token)

			this.offset = vadd(vsub(vmul(v(tk.X, tk.Y), cellSize), mousePos), 10)
			this.tkCanvas = c;
		},
		onDrop: function(x,y) {
			const p0 = tile(selection.pos)
			maphub.modifyTokens(shape.point(p0), { move:vsub(tile(v(x,y)), p0) })
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
			ctx.lineTo(mousePos.x, mousePos.y);
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
			const dx = mousePos.x - selection.pos.x
			const dy = mousePos.y - selection.pos.y

			if(this.rect)
			{
				for(let tk of map.tokens)
				{
					if(!shape.containsToken(this.rect, tk))
						continue;

					ct.putToken(tk, ...vx(vadd(vmul(v(tk.X, tk.Y),cellSize), vsub(mousePos, selection.pos))));
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
				maphub.modifyTokens(this.rect, { move: vsub(tile(mousePos), tile(selection.pos)) });
				this.reset();
			}
			else if(selection.pos.x != mousePos.x || selection.pos.y != mousePos.y)
			{
				this.rect = shape.new("mask", tile(selection.pos), tile(mousePos))

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
				maphub.removeAll(this.rect)
		},
		tokenColor: "blue"
	},
	circle: {
		hasRuler: true,
		circ: null,
		specialRuler: function() {
			if(!this.circ)
				return shape.circle.radius(this.getCircle());
		},
		isSelected: function(tk) {
			return this.circ != null
				&& shape.containsToken(this.circ, tk)
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

					ct.putToken(tk, ...vx(vadd(vmul(v(tk.X, tk.Y), cellSize), vsub(mousePos, selection.pos))));
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

			return this.circ ?? shape.new("circle", rtile(selection.pos), rtile(mousePos))

//			return { x: cX, y: cY,
//				r: Math.round(Math.sqrt(Math.pow(cX - xe / cellSize, 2) + Math.pow(cY - ye / cellSize, 2))) }
		},
		onDrop: function(x,y) {
			if(this.circ != null)
			{
				const off =  vsub(tile(mousePos), tile(selection.pos))
				maphub.modifyTokens(this.circ, { move: off });

				this.reset();
			}
			else if(selection.pos.x != mousePos.x || selection.pos.y != mousePos.y)
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
				return shape["circle"].radius(this.getShape());
		},
		getKind : function() { return this.tool.selection.value; },
		getShape: function() {
			if(this.shape)
				return this.shape

			const k = this.getKind()

			if(shape[k].vertexCentered)
				return shape.new(k, rtile(selection.pos), rtile(mousePos))
			else
				return shape.new(k, tile(selection.pos), tile(mousePos))
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

					ct.putToken(tk, ...vx(vadd(vmul(v(tk.X, tk.Y), cellSize),vsub(mousePos, selection.pos))));
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
				const off =  vsub(tile(mousePos), tile(selection.pos))
				maphub.modifyTokens(this.shape, { move: off });
				this.reset();
			}
			else if(selection.pos.x != mousePos.x || selection.pos.y != mousePos.y)
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
				return shape["circle"].radius(this.getShape());
		},
		getShape: function() {
			if(this.shape)
				return this.shape

			if(shape[this.kind].vertexCentered)
				return shape.new(this.kind, rtile(selection.pos), rtile(mousePos))
			else
				return shape.new(this.kind, tile(selection.pos), tile(mousePos))
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

					ct.putToken(tk, ...vx(vadd(vmul(v(tk.X, tk.Y),cellSize), vsub(mousePos, selection.pos))));
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
				const off =  vsub(tile(mousePos), tile(selection.pos))
				maphub.modifyTokens(this.shape, { move: off });
				this.reset();
			}
			else if(selection.pos.x != mousePos.x || selection.pos.y != mousePos.y)
			{

				this.shape = this.getShape()
				layers.token.draw();
				this.tokenColor = "gray"
			}
		}
	},
	spawnzone: {
		onDrop: function() {
			maphub.setSpawnZone(tile(selection.pos.x), tile(selection.pos.y), tile(mousePos.x), tile(mousePos.y))
		},
		draw: function(ct) {
			const dx = mousePos.x - selection.pos.x
			const dy = mousePos.y - selection.pos.y

			ct.beginPath()
			ct.globalAlpha = 0.4
			ct.strokeStyle = "gold"
			ct.fillStyle = "yellow"
			ct.lineWidth = 2

			ct.fillRect(selection.pos.x, selection.pos.y, dx, dy)
			ct.rect(selection.pos.x, selection.pos.y, dx, dy);
			ct.stroke();
		}
	},
	fill: {
		onDrop: function() {
			const a = tile(selection.pos)
			const b = tile(mousePos)

			for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++)
			{
				for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++)
				{
					maphub.color(x, y, parseInt(toolbox.tools.tileedit.Color.value.substring(1), 16));

				}
			}
		},
		draw: function(ct) {
			const dx = mousePos.x - selection.pos.x
			const dy = mousePos.y - selection.pos.y

			ct.beginPath()
			ct.globalAlpha = 0.4
			ct.fillStyle = colorString(toolbox.tools.tileedit.Color.value);
			ct.lineWidth = 2

			ct.fillRect(selection.pos.x, selection.pos.y, dx, dy)
			ct.rect(selection.pos.x, selection.pos.y, dx, dy);
		}
	}
}

// Handles the right click menu
const contextmenu = {
	menus: {
		token: {
			/**@param {number} x
			 * @param {number} y */
			condition: function(x, y) { return tokenAt(...vx(tile(v(x,y)))) },
			onMapUpdate: function() { if(map.tokens.indexOf(contextmenu.data) == -1) contextmenu.hide() },
			updateMask: mapFields.tokens,

			/**@param {token} tk */
			delete: function(tk) { maphub.removeAll(shape.point(tk.X, tk.Y)); contextmenu.hide(); },
			/**@param {token} tk */
			clean: function(tk) { mapInterface.uploadImage(idName(tk), null) },
			/**@param {token} tk
			 * @param {MouseEvent} ev */
			initiative: function(tk, ev) { toolbox.tools.initiative.insert(tk, !ev.shiftKey); },
			/**@param {token} tk */
			turn: function(tk) { maphub.modifyTokens(shape.point(tk.X, tk.Y), { turn: true }) },
			/**@param {token} tk The token
			 * @param {MouseEvent} ev The mouse event
			 * @param {Number} cond The condition's INDEX in the conditions array
			 */
			cond: function(tk, ev, cond)
			{
				if(ev.shiftKey || ev.ctrlKey)
				{
					if(conditions[cond].dnd)
						window.open("https://www.dndbeyond.com/sources/basic-rules/appendix-a-conditions#"+c.name, "_blank");

					return;
				}

				maphub.modifyTokens(shape.point(tk.X, tk.Y),
					((tk.Conditions & (1 << cond)) == 0) ? { conditionsAdd: 1 << cond } : { conditionsSub: 1 << cond })
			}
		},
		effect: {
			/**@param {number} x
			 * @param {number} y */
			condition: function(x, y) {
				return map.effects.find(e => shape.containsPoint(e.shape, x / cellSize, y / cellSize));
			},
			onMapUpdate: function() { if(map.effects.indexOf(contextmenu.data) == -1) contextmenu.hide() },
			updateMask: mapFields.effects,

			/**@param {effect} e */
			delete: function(e) { maphub.removeEffect(e.shape); contextmenu.hide(); },
			/**@param {effect} e */
			destroy: function(e) { maphub.removeAll(e.shape); },
			/**@param {effect} e */
			blink: function(e) { maphub.blinkShape(e.shape); },
		}
	},
	data: null,
	visible: null,
	hook: { mask: 0, callback: function(){ if(contextmenu.visible?.onMapUpdate) contextmenu.visible.onMapUpdate(); } },
	hide: function() {
		// Can't use .hide() because we still need the width & height
		this.visible.window.style.visibility = "hidden";
		this.hook.mask = 0;
		this.visible = null;
	},
	/**@param {MouseEvent} event */
	onContextMenu: function(event) {
		if(!isDM)
			return;
		if(this.visible)
			this.hide();
		else
		{
			var menu;

			for (const mn in this.menus) {
				const m = this.menus[mn];

				if(this.data = m.condition(event.offsetX, event.offsetY))
				{
					menu = m;
					break;
				}
			}

			if(!menu)
				return;

			/**@type {HTMLElement} */
			const win = menu.window;

			//this.token = tokenAt(...vx(tile({ x: , y: event.offsetY })));
			const view = document.getElementsByTagName("html")[0].getBoundingClientRect()
			const w = win.offsetWidth;
			const h = win.offsetHeight;

			this.visible = menu;
			this.hook.mask = menu.updateMask ?? 0;
			win.style.left = `${(event.offsetX + view.left + w >= view.width) ? event.offsetX - w : event.offsetX}px`;
			win.style.top = `${(event.offsetY > h) ? event.offsetY - h : event.offsetY}px`;
			win.style.visibility = "visible";
		}
	},
	onMapUpdate: function(flags) {
		if(this.visible?.onMapUpdate)
			this.visible.onMapUpdate(flags);
	},
	init: function() {
		for (const menuName in this.menus)
		{
			const menu = this.menus[menuName];
			menu.window = document.getElementById(`${menuName}menu`);

			for (const button in menu)
			{
				if(button === "cond")
				{
					for (let i = 0; i < conditions.length; i++)
					{
						const c = conditions[i];
						const b = document.createElement("button");

						b.className = "bare";
						b.id = `${menuName}menu_cond_${c.name}`
						b.innerText = c.symbol;

						b.onclick = ev => menu.cond(contextmenu.data, ev, i)
						menu.window.appendChild(b);

						if((i+1) % 4 == 0)
							menu.window.appendChild(document.createElement("br"));
					}
				}
				else if(button !== "window" && button !== "condition" && button !== "onMapUpdate" && button !== "updateMask")
					document.getElementById(`${menuName}menu_${button}`).onclick =
						function(ev) { menu[button](contextmenu.data, ev); }
			}

		}

		mapUpdateHooks.push(this.hook);
	}
}

// Contains the event Handlers
const handlers = {
	/** Redraws hovering token and ruler length display
	 * @param {MouseEvent} evnt
	 * @returns {void} nothing
	 */
	onMouseMove : function(evnt)
	{
		if(toolbox.activeTool == toolbox.tools.tileedit &&
			(tile(mousePos.x) != tile(evnt.pageX) || tile(mousePos.y) != tile(evnt.pageY)))
			toolbox.tools.tileedit.onMouseDown(evnt)

		mousePos = { x: evnt.pageX, y: evnt.pageY }
		layers.special.draw()

		if(selection.current.hasRuler)
			rulerDisplay.update();
	},
	/** Picks up a token or anchors a ruler
	 * @param {MouseEvent} evnt
	 * @returns {void} nothing
	 */
	onCanvasMouseDown: function(evnt)
	{
		if(event.button === 2)
			return;

		if(contextmenu.visible)
		{
			contextmenu.hide();
			return;
		}

		mousePos = { x: evnt.pageX, y: evnt.pageY }

		const cur = selection.current

		toolbox.onMouseDown(evnt);
		canvasStyle.cursor = toolbox.getCursor();

		if(selection.current != null)
		{
			selection.last = cur
			selection.pos = mousePos
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
	/** Moves the held token or removes the ruler
	 * @param {MouseEvent} evnt
	 * @returns {void} nothing
	 */
	onMouseUp: function(evnt)
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

		canvasStyle.cursor = toolbox.getCursor();
	},
	/** Blinks a token
	 * @param {MouseEvent} evnt
	 * @returns {void} nothing
	 */
	onCanvasDoubleClick: function(evnt)
	{
		const cX = tile(evnt.pageX)
		const cY = tile(evnt.pageY)
		const tk = tokenAt(cX, cY)

		if(typeof toolbox.activeTool?.dontBlink !== "undefined")
			return;
		if(tk && (!isHidden(tk) || isDM))
			maphub.blink(blinkKind.token, tk.X, tk.Y);
		else
			maphub.blink(blinkKind.tile, cX, cY);
	},
	/** Handles drag and drop onto the canvas
	 * @param {DragEvent} ev
	 * @returns {void} nothing
	 */
	onCanvasDrop: function(ev)
	{
		function getFile(callback)
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
					console.error("Error: Drop: Via Files: Expected Image");
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

		getFile(f => {
			mapInterface.uploadImage(idName(tk), f)
		});
	},
	/** Handles drag sans drop over the canvas. Prevents the browser from opening the file.
	 * @param {DragEvent} evnt
	 * @returns {void} nothing
	 */
	onCanvasDragover: function(evnt)
	{
		// Prevent opening the file
		evnt.preventDefault();
	},
	/** Handles keyboard keys.
	 * @param {KeyboardEvent} evnt
	 * @returns {void} nothing
	 */
	onKeyDown: function(evnt)
	{
		switch(evnt.code)
		{
			case "Escape":
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
			break;

			case "Delete":
				if(toolbox.activeTool == toolbox.tools.spawnzone)
					maphub.setSpawnZone(-1, -1, -1, -1);
				else if(isDM)
				{
					const s = selection.getShape()

					if(s)
						maphub.removeAll(s)
				}
			break;

			case "KeyH":
			{
				const s = selection.getShape()

				if(s)
					maphub.blinkShape(s)
			}
			break;

			case "KeyE":
			{
				const s = selection.getShape()

				if(s)
					effects.onBlinkShape(s)
			}
			break

			case "KeyT":
			{
				const s = selection.getShape()

				if(s)
					maphub.modifyTokens(s, { turn: true })
			}
			break;
		}
	},
	/** Opens the custom context menu
	 * @param {MouseEvent} event
	 * @returns {void} nothing
	 */
	onCanvasContextMenu: function(event) {
		contextmenu.onContextMenu(event);
		event.preventDefault();
	}
}

/** Allows for hooking of map update event
 * @type {Array.<{ mask : number, callback: function }>}
*/
const mapUpdateHooks = [
	{ mask: mapFields.spawn, callback: function() { if(toolbox.activeTool === toolbox.tools.spawnzone) layers.special.draw() } },
	{ mask: mapFields.settings, callback: () => toolbox.tools.settings.update() },
	{ mask: mapFields.effects, callback: () => effects.onEffectUpdate() }
]

/* Handles outside interaction with the UI */
const uiInterface = {
	player: null,

	/** Initializes the UI
	 * @returns {void} nothing
	*/
	init: function() {
		const s = document.getElementById("canvas_stack");
		s.addEventListener("mousedown", handlers.onCanvasMouseDown);
		document.addEventListener("mouseup", handlers.onMouseUp);
		s.addEventListener("dblclick", handlers.onCanvasDoubleClick);
		s.addEventListener("drop", handlers.onCanvasDrop);
		s.addEventListener("dragover", handlers.onCanvasDragover);
		s.addEventListener("contextmenu", handlers.onCanvasContextMenu);

		document.body.addEventListener("keydown", handlers.onKeyDown)
		this.player = map.tokens.find(tk => tk.Name === playerToken) ?? null;

		toolbox.init();
		contextmenu.init();
	},

	/** Reacts to changes in the map data structure. Called by maphub.
	 * @param {number} fieldIds	The changed field IDs, following the mapFields definition
	 * @param {bool?} isResync	Whether or not the map update was from a resync command
	 * @returns {void} nothing
	 */
	onMapUpdate: function(fieldIds, isResync) {
		for (const hook of mapUpdateHooks) {
			try
			{
				if(hook.mask & fieldIds)
					hook.callback(fieldIds, isResync);
			}
			catch(ex)
			{
				console.error(ex)
			}
		}
	},

	/** Reacts to highlighted shape. Called by maphub.
	 * @param {shape} s	The blinked shape
	 * @returns {void} nothing
	 */
	onBlinkShape: function(s) {
		effects.onBlinkShape(s);
	},

	/** Returns the text and border color for the given token. Called from the layers.token.draw().
	 * @param {token} token	The token
	 * @returns {string} Its color
	 */
	getTokenColor: function(token) {
		if(selection.current?.isSelected && selection.current.isSelected(token))
			return selection.current.tokenColor;

		return "black"
	},

	/** Draws the UI to the given canvas. Called from layers.special.draw().
	 * @param {CanvasRenderingContext2D} ct	The canvas' context
	 * @returns {void} nothing
	 */
	draw: function(ct) {
		ct.clear();

		if(toolbox.pinned?.draw)
		{
			ct.save();
			toolbox.pinned.draw(ct);
			ct.restore();
		}

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