"use strict";

/** An error-checking report for maphub functions. undefined indicates no error.
 * @typedef {number|string|undefined|longCheckReport} checkReport
 * @typedef longCheckReport
 * @property {string} msg	The error message shown in console
 * @property {number} field	The map fields affected in addition to the tool's modifies field
*/

/** @typedef command
 * @property {number} modifies	The fields that are modified by this command, as defined by mapFields
 * @property {boolean=} sendsObject	When set, causes its arguments to be serialized to JSON before sending
 * @property {function} receive	Called when receiving the command with all received arguments
 * @property {function=} checkSent Checks argument list before sending. Returns a {@link checkReport}
 * @property {function=} checkReceived Checks received argument list for inconsistencies. Returns a {@link checkReport}
 * @property {function=} check Used as checkSent() and checkReceived(). Returns a {@link checkReport}
 * @property {function=} onFail Called when the method fails via fail command.
 */

 /** Returns a {@link checkReport} with the size field set to 1.
  * @param {string} [msg="Out of bounds"] The error message
  * @returns {checkReport} A check report object
  */
function oob(msg)
{
	return { field: mapFields.size, msg: msg ?? "Out of bounds" };
}

const blinkKind =
{
	tile : 0,
	token : 1,
	initiative: 2,
	max : 2,
	min : 0,
}

const maphub =
{
	/** @type {Boolean} */
	skipCommandSendingChecks: false,
	/** @type {Object.<string,command>} */
	commands: {
		AddToken: {
			/**@param {token} tk
			 * @returns {void} nothing
			 */
			receive: function(tk) {
				map.tokens.push(tk)
			},
			/**@param {token} tk
			 * @returns {checkReport} */
			check: function(tk) {
				if(tk.Name == null || tk.Name.trim() == "")
					return "Refusing add with illegal Name value"
				else if(outOfBounds(tk.X,tk.Y,tk.Width,tk.Height))
					return oob("Refusing add out of bounds")
				else if(anyTokensAt(tk.X,tk.Y,tk.Width,tk.Height))
					return "Refusing add that would collide"
			},
			sendsObject: true,
			modifies: mapFields.tokens
		},

		AddEffect: {
			/**@param {effect} e
			 * @returns {void} nothing
			 */
			receive: function(e) {
				map.effects.push(e)
			},
			/**@param {effect} e
			 * @returns {checkReport} */
			check: function(e) {
				if(shape.empty(e.shape))
					return "Refusing AddEffect with empty shape"
				if(e.color >> 24)
					return "Refusing AddEffect with bad color"
			},
			sendsObject: true,
			modifies: mapFields.effects
		},

		Blink: {
			receive: mapInterface.blink,
			/**
			 *
			 * @param {number} kind The blink kind, as defined in blinkKind
			 * @param {number} x	The tile or token's x
			 * @param {number} y	The tile or token's y
			 * @returns {checkReport} */
			check: function(kind,x,y){
				if(outOfBounds(x,y))
					return oob("Refusing blink out of bounds")
				if(kind < blinkKind.min || kind > blinkKind.max)
					return "Invalid blink kind"
				if(kind >= blinkKind.token && !tokenAtExact(x,y))
					return { field: mapFields.tokens, msg: "Refusing BlinkToken without token" }
			},
			modifies: 0
		},

		BlinkShape: {
			/**@param {shape} s
			 * @returns {void} nothing
			 */
			receive: function(s) {
				mapInterface.blinkShape(s)
			},
			check: function(){ },
			sendsObject: true,
			modifies: 0
		},

		Color: {
			/**@param {number} x The tile's x
			 * @param {number} y The tile's y
			 * @param {number} c The new color
			 */
			receive: function(x, y, c) {
				map.colors[x][y] = c
			},
			/**@param {number} x The tile's x
			 * @param {number} y The tile's y
			 * @param {number} c The new color
			 * @returns {checkReport} */
			check: function(x, y, c){
				if(outOfBounds(x,y))
					return oob("Refusing color out of bounds")
				else if(map.colors[x][y] == c)
					return "Refusing color without change"
			},
			modifies: mapFields.colors
		},

		Debug: {
			/**@param {string} context
			 * @param {string} connection
			 * @returns {void} nothing
			 */
			receive: function(context, connection) {
				console.log(JSON.parse(connection));
				console.log(JSON.parse(context));
			},
			check: function() { },
			modified: 0,
		},

		RtxUpdate: {
			/**@param {rtxinfo} data
			 * @returns {void} nothing
			 */
			receive: function(data) {
				map.rtxInfo = data ?? { globallight: 2, sources: {}, opaque: [] }
			},
			check: function(data){
				if(JSON.stringify(data) == JSON.stringify(map.rtxInfo))
					return "Refusing StxUpdate without change"
			},
			sendsObject: true,
			modifies: mapFields.rtxInfo
		},

		SetImage: {
			/**@param {token} token
			 * @param {string} imageID
			 * @returns {void} nothing
			 */
			receive: function(token, imageID) {
				map.sprites[token] = imageID;
				mapInterface.gotImage(token);
			},
			checkSent: function() {
				return "SetImage isn't allowed from Client side!";
			},
			/**@param {token} token
			 * @param {string} imageID
			 * @returns {checkReport} */
			checkReceived: function(token, imageID) {
				if(imageID === null && (typeof map.sprites[token] === "undefined" || map.sprites[token] === null))
					return "Trying to remove nonexistent texture";
			},
			modifies: mapFields.sprites
		},

		ModifyTokens: {
			/** @type {{ move: vec2, timestamp: number }}
			 * 	stores the last move that was denied because it would move your player token into a wall */
			deniedMove: {},
			/**@param {shape} s		The shape
			 * @param {{ move: vec2?, conditionsAdd: Number?, conditionsSub: Number?, turn: boolean? }} delta Token Change
			 * @returns {void} nothing
			 */
			receive: function(s, delta) {
				for (let tk of map.tokens) {
					if(shape.containsToken(s, tk))
					{
						if(delta.move)
						{
							tk.X += delta.move.x
							tk.Y += delta.move.y
						}
						if(delta.turn)
						{
							const w = tk.Width
							tk.Width = tk.Height
							tk.Height = w
						}
						if(delta.conditionsAdd)
							tk.Conditions |= delta.conditionsAdd;
						if(delta.conditionsSub)
							tk.Conditions &= ~delta.conditionsSub;
					}
				}
			},
			/**@param {shape} s		The shape
			 * @param {{ move: vec2?, hidden: bool? }} delta Token Change
			 * @returns {void} nothing
			 */
			check: function(s, delta) {
				if((!delta.move || (!delta.move.x && !delta.move.y)) && !delta.conditionsAdd && !delta.conditionsSub && !delta.turn)
					return "Refusing modifyTokens without change";

				if(delta.move || delta.turn)
				{
					let moved = 0
					const points = new Set();

					for (let tk of map.tokens) {
						let hb = { x: tk.X, y: tk.Y, w: tk.Width, h: tk.Height }

						if(shape.containsToken(s, tk))
						{
							moved++

							if(delta.move)
							{
								hb.x += delta.move.x
								hb.y += delta.move.y
							}

							if(delta.turn)
							{
								const w = hb.w
								hb.w = hb.h
								hb.h = w
							}
						}

						if(outOfBounds(hb.x, hb.y, hb.w, hb.h))
							return oob(`Refusing modifyTokens that would put ${flatName(tk)} out of bounds`);

						for (let dx = 0; dx < hb.w; dx++) {
							for (let dy = 0; dy < hb.h; dy++) {
								let i = (hb.x + dx) + (hb.y + dy) * map.width

								if(points.has(i))
									return `Refusing modifyTokens that would make ${flatName(tk)} collide`;

								points.add(i);
							}
						}
					}
					let plr = uiInterface.findPlayer();

					if(plr && shape.containsToken(s, plr) && map.rtxInfo.globallight < lightLevel.bright)
					{
						let npos = vadd(vadd(v(plr.X, plr.Y), delta.move), vdiv(v(plr.Width, plr.Height), 2));
						let nt = vmap(npos, Math.floor);
						let col = map.colors[nt.x][nt.y];
						
						if(map.rtxInfo.opaque.some(x => x == col))
						{
							let ts = Date.now();
							/** @type {{ move: vec2, timestamp: number }} */
							let dm = this.deniedMove;

							if(delta.move.x !== dm.move?.x || delta.move.y !== dm.move?.y || ts - dm.timestamp > 5000)
							{
								this.deniedMove = { move: delta.move, timestamp: ts }
								return "Refusing move that places the player in a wall. Repeat the same move to bypass."
							}
						}
					}

					if(moved == 0)
						return "Refusing modifyTokens without any tokens"
				}
			},
			sendsObject: true,
			modifies: mapFields.tokens

		},

		RemoveAll: {
			/**@param {shape} s	The shape
			 * @returns {void} nothing */
			receive: function(s){
				map.tokens.removeAll(tk => shape.containsToken(s, tk))
			},
			/**@param {shape} s
			 * @returns {checkReport} */
			check: function(s) {
				if(!map.tokens.some(tk => shape.containsToken(s, tk)))
					return "Refusing removeAll without any tokens";
			},
			sendsObject: true,
			modifies: mapFields.tokens
		},

		RemoveEffect: {
			/**@param {shape} s
			 * @returns {void} nothing
			 */
			receive: function(s) {
				map.effects.removeAll(e => shape.equal(s, e.shape))
			},
			/**@param {shape} s
			 * @returns {checkReport} */
			check: function(s) {
				if(!map.effects.some(e => shape.equal(e.shape,s)))
					return "Refusing RemoveEffect without matching effect"
			},
			sendsObject: true,
			modifies: mapFields.effects
		},

		Resync: {
			/**@param {number} field
			 * @param {string} data
			 */
			receive: function(field, data){
				const d = JSON.parse(data);
				console.log(d);

				if(field & mapFields.tokens)
					map.tokens = d.tokens
				if(field & mapFields.size)
				{
					if(map.width == d.width && map.height == d.height)
					{ // if size didn't change, avoid expensive redrawing
						field &= ~mapFields.size
					}
					else
					{
						map.width = d.width
						map.height = d.height
					}
				}

				mapInterface.onMapUpdate(field, true);
			},
			checkReceived: function(field, data) {},
			/**@param {number} field
			 */
			checkSent: function(fields){
				if(fields == 0)
					return "Refusing Resync without fields";

				console.error(`DESYNC DETECTED! Field IDs ${fields.toString(2)} are desynchronized`)
			},
			modifies: 0,
		},

		Settings: {
			/**@typedef {Object} settings
			 * @property {number} Sqrt2Numerator
			 * @property {number} Sqrt2Denominator
			 * @property {string} DistanceUnit
			 */

			/**@param {settings} o
			 * @returns {void} nothing
			 */
			receive: function(o){
				map.settings = o
			},
			/**@param {settings} o
			 * @returns {checkReport} */
			check: function(o){
				if(o.Sqrt2Numerator < 1 || o.Sqrt2Denominator < 1)
					return "Refusing settings with illegal values";
				if(compareObj(o, map.settings))
					return "Refusing settings without change"
			},
			sendsObject: true,
			modifies: mapFields.settings
		},

		SetSize: {
			/**@param {number} left
			 * @param {number} right
			 * @param {number} up
			 * @param {number} down
			 * @returns {void} nothing
			 */
			receive: function(left, right, up, down)
			{
				const w = map.width + left + right
				const h = map.height + up + down

				map.tokens.removeAll(tk => cutByResize(tk, left, right, up, down))

				for (const tk of map.tokens) {
					tk.X += left;
					tk.Y += up;
				}

				const d = v(left, up);

				for (const ef of map.effects) {
					ef.shape.start = vadd(ef.shape.start, d);
					ef.shape.end = vadd(ef.shape.end, d);
				}

				const oob = p => p.x < 0 || p.x >= w || p.y < 0 || p.y >= h;
				map.effects.removeAll(ef => oob(ef.shape.start) || oob(ef.shape.end));

				// initialize and fill a new color array
				const newColors = Array(w)

				for (let x = 0; x < w; x++)
					newColors[x] = Array(h).fill(0xFFFFFF)

				// get colors from olf tile array
				for (let x = 0; x < map.width; x++)
				{
					let newX = x + left;

					if(newX < 0 || newX >= w)
						continue;

					for (let y = 0; y < map.height; y++)
					{
						let newY = y + up;

						if(newY < 0 || newY >= h)
							continue;

						newColors[newX][newY] = map.colors[x][y];
					}
				}

				map.colors = newColors
				map.width = w
				map.height = h

			},
			checkReceived: function(){},
			/**@param {number} left
			 * @param {number} right
			 * @param {number} up
			 * @param {number} down
			 * @returns {checkReport} */
			checkSent: function(left,right,down,up,force) {
				if(map.width + left + right == 0 || map.height + up + down == 0)
					return "Refusing SetSize that would make area 0";
			},
			modifies: mapFields.size,
		},

		SetSpawnZone: {
			/**@param {number} sx Start x
			 * @param {number} sy Start y
			 * @param {number} ex End x
			 * @param {number} ey End y
			 * @returns {void} nothing
			 */
			receive: function(sx, sy, ex, ey) {
				if(sx == sy && sy == ex && ex == ey && ey == -1)
					map.spawn = null;
				else
					map.spawn = shape.new("mask", v(sx, sy), v(ex, ey));
			},
			/**@param {number} sx Start x
			 * @param {number} sy Start y
			 * @param {number} ex End x
			 * @param {number} ey End y
			 * @returns {checkReport} */
			check: function(sx, sy, ex, ey) {
				if(sx == sy && sy == ex && ex == ey && ey == -1)
				{
					if(!map.spawn)
						return "Cannot remove spawn zone that doesn't exist."
				}
				else if(outOfBounds(Math.min(sx, ex), Math.min(sy, ey), Math.abs(sx - ex), Math.abs(sy - ey)))
					return oob("Refusing SetSpawnZone out of bounds");
			},
			modifies: mapFields.spawn,
		},

		SetTexture: {
			receive: function(tk, texture) {

			},
			check: function(tk, texture) {

			},
			modifies: mapFields.sprites,
		},

		Fail: {
			/**@param {string} method
			 * @param {string} reason
			 * @returns {void} nothing
			 */
			receive: function(method, reason) {
				const cmd = maphub.commands[method]
				console.error(`${method} failed because: ${reason}`);

				if(cmd.onFail)
					cmd.onFail(reason);

				maphub.resync(cmd.modifies | (reason === "Out of bounds" ? mapFields.size : 0))
			},
			checkReceived: function(){},
			checkSent: function() {
				return "The Fail Command may be sent from server-side only!"
			},
			modifies: 0,
		}
	},
	connection: new signalR.HubConnectionBuilder().withUrl(huburl).build(),
	/** Initializes the connection and generates the invoker functions of the form maphub.[camelCase command name] */
	init: function(){
		//const connection = new signalR.HubConnectionBuilder().withUrl(huburl).build();
		//this.connection = connection;
		const connection = this.connection;

		connection.start().catch(function (err) {
			alert("Cannot establish connection.\nPlease refresh\n");
			console.error(err.toString());
		});

		connection.onclose(function(err) {
			alert("Connection lost.\nPlease refresh\n");
			console.error(err.toString());
		})

		for (const command in this.commands) {
			/** @type {command} */
			const cmd = this.commands[command]
			// convert command name from PascalCase to camelCase
			const ccName = command[0].toLowerCase() + command.substring(1);

			this.connection.on(command, function() {
				try
				{
					const args = cmd.sendsObject ? Array.from(arguments).map(JSON.parse) : arguments
					/** @type {checkReport} */
					const ck = cmd.checkReceived ?  cmd.checkReceived(...args) : cmd.check(...args)

					switch(typeof ck)
					{
						case "undefined":
							cmd.receive(...args)
							mapInterface.onMapUpdate(cmd.modifies)
						break;

						case "number":
							maphub.resync(cmd.modifies | ck);
						break;

						case "object":
							maphub.resync(cmd.modifies | ck.field);
						break;

						default:
							maphub.resync(cmd.modifies)
						break;
					}
				}
				catch(ex)
				{
					console.error(`maphub: on ${command}:`, ex);
				}
			})

			this[ccName] = function() {
				/** @type {checkReport} */
				const ck = maphub.skipCommandSendingChecks ? undefined : cmd.checkSent ?  cmd.checkSent(...arguments) : cmd.check(...arguments)

				switch(typeof ck)
				{
					case "undefined":
						const args = cmd.sendsObject ? Array.from(arguments).map(JSON.stringify) : arguments;
						this.connection.invoke(command, ...args).catch(e => {
							console.error(e.toString());
							throw e;
						});
					return;


					case "string":
						console.log(ck);
					break;

					case "object":
						console.log(ck.msg);
					break;

					default:
						console.log("Refusing ", ccName);
					break;
				}

				//if(command.startsWith("Move"))
				//	mapInterface.onMapUpdate(mapFields.tokens);
			}
		}

	}
}

maphub.init();
