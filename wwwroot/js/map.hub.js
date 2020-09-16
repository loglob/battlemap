"use strict";

/** An error-checking report for maphub functions. undefined indicates no error.
 * @typedef {?number|string|Object} checkReport
 * @property {string} msg	The error message shown in console
 * @property {number} field	The map fields affected in addition to the tool's modifies field
*/

/** @typedef command
 * @property {number} modifies	The fields that are modified by this command, as defined by mapFields
 * @property {boolean=} sendsObject	When set, causes its arguments to be serialized to JSON before sending
 * @property {function} receive	Called when receiving the command with all received arguments
 * @property {function=} checkSent Checks argument list before sending. Returns a {@link checkReport}
 * @property {function=} checkReceived Checks received argument list for incensistencies. Returns a {@link checkReport}
 * @property {function=} check Used as checkSent() and checkReceived(). Returns a {@link checkReport}
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
	/** @type {Object.<string,command>} */
	commands: {
		AddToken: {
			receive: function(tk) {
				map.tokens.push(tk)
			},
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
			receive: function(e) {
				//map.effects.push( { color: c, kind: k, start: { x: sx, y: sy }, end: { x: ex, y: ey } })
				map.effects.push(e)
			},
			check: function(e) {
				if(shape.empty(e))
					return "Refusing AddEffect with empty shape"
				if(e.color >> 24)
					return "Refusing AddEffect with bad color"
			},
			sendsObject: true,
			modifies: mapFields.effects
		},

		Blink: {
			receive: mapInterface.blink,
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
			receive: function() { 
				mapInterface.blinkShape(shape.from(...arguments))
			},
			check: function(){ },
			modifies: 0
		},

		Color: {
			receive: function(x, y, c) {
				map.colors[x][y] = c
			},
			check: function(x, y, c){
				if(outOfBounds(x,y))
					return oob("Refusing color out of bounds")
				else if(map.colors[x][y] == c)
					return "Refusing color without change"
			},
			modifies: mapFields.colors
		},

		Debug: {
			receive: function(conn, ctxt) {
				console.log(JSON.parse(conn));
				console.log(JSON.parse(ctxt));
			},
			check: function() { },
			modified: 0,
		},

		GotImage: {
			receive: mapInterface.gotImage,
			check: function(img){},
			modifies: 0,
		},
		SetImage: {
			receive: function(token, imgid) {
				map.sprites[token] = imgid;
				mapInterface.gotImage(token);
			},
			checkSent: function() {
				return "SetImage isn't allowed from Client side!";
			},
			checkReceived: function(token, imgid) {
				if(imgid === null && (typeof map.sprites[token] === "undefined" || map.sprites[token] === null))
					return "Trying to remove nonexistant texture";
			},
			modifies: mapFields.sprites
		},

		Move: {
			receive: function(oldX, oldY, newX, newY){
				const tk = tokenAtExact(oldX, oldY);
				
				tk.X = newX
				tk.Y = newY
			},
			checkSent: function(oldX, oldY, newX, newY){
				if(oldX == newX && oldY == newY)
					return "Refusing move without change"

				const tk = tokenAt(oldX, oldY);
				const x = newX - (oldX - tk.X)
				const y = newY - (oldY - tk.Y)

				if(tk == null)
					return "Refusing move without token"
				
				const cols = tokensAt(x, y, tk.Width, tk.Height);

				if(cols.length > 1 || (cols.length == 1 && cols[0] !== tk))
					return "Refusing move that would collide"
				if(outOfBounds(x, y, tk.Width, tk.Height))
					return "Refusing move out of bounds"
			},
			checkReceived: function(oldX, oldY, newX, newY){
				const tk = tokenAtExact(oldX, oldY);
				
				if(!tk || wouldCollide(tk, newX, newY))
					return 0
				if(outOfBounds(newX, newY, tk.Width, tk.Height))
					return mapFields.size
			},
			modifies: mapFields.tokens
		},
		MoveAll: {
			receive: function(k, sx, sy, ex, ey, offx, offy) {
				var s = shape.from(...arguments)

				for (let tk of map.tokens) {
					if(shape.containsToken(s, tk))
					{
						tk.X += offx
						tk.Y += offy
					}
				}
			},
			check: function(k, sx, sy, ex, ey, offx, offy) {
				if(offx === 0 && offy === 0)
					return "Refusing moveall without change";
				
				var s = shape.from(...arguments)
				let moved = 0

				for (let tk of map.tokens) {
					if(shape.containsToken(s, tk))
					{
						moved++
						const nX = tk.X + offx
						const nY = tk.Y + offy
					
						if(outOfBounds(nX, nY, tk.Width, tk.Height))
							return oob(`Refusing moveall that would put ${flatName(tk)} out of bounds`);
						
						for (const t of map.tokens)
						{
							if(tokenIn(t, nX, nY, tk.Width, tk.Height) && !shape.containsToken(s, t))
								return `Refusing moveall that would make ${flatName(tk)} collide with ${flatName(t)}`;
						}
					}
				}

				if(moved == 0)
					return "Refusing moveall without any tokens"
			},
			modifies: mapFields.tokens
		},

		Remove: {
			receive: function(x, y){
				for (let i in map.tokens) {
					const e = map.tokens[i];
				
					if(e.X == x && e.Y == y)
					{
						map.tokens.splice(i, 1)
						return;
					}
				}
			},
			checkReceived: function(x,y){
				if(!tokenAtExact(x, y))
					return mapFields.tokens;
			},
			checkSent: function(x,y) {
				if(!tokenAt(x,y))
					return "Refusing remove without token"
			},
			modifies: mapFields.tokens
		},
		RemoveAll: {
			receive: function(s){
				map.tokens.removeAll(tk => shape.containsToken(s, tk))
			},
			check: function(s) {
				if(!map.tokens.some(tk => shape.containsToken(s, tk)))
					return "Refusing removeAll without any tokens";
			},
			sendsObject: true,
			modifies: mapFields.tokens
		},

		RemoveEffect: {
			receive: function(s) {
				map.effects.removeAll(e => shape.equal(s, e))
			},
			check: function(s) {
				if(!map.effects.some(e => shape.equal(e,s)))
					return "Refusing RemoveEffect without matching effect"
			},
			sendsObject: true,
			modifies: mapFields.effects
		},

		Resync: {
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

				mapInterface.onMapUpdate(field);
			},
			checkReceived: function(field, data) {},
			checkSent: function(fields){
				if(fields == 0)
					return "Refusing Resync without fields";

				console.error(`DESYNC DETECTED! Field IDs ${fields.toString(2)} are desynced`)
			},
			modifies: 0,
		},

		Settings: {
			receive: function(o){
				map.settings = o
			},
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
			receive: function(left, right, up, down)
			{
				const w = map.width + left + right
				const h = map.height + up + down 

				map.tokens.removeAll(tk => cutByResize(tk, left, right, up, down))

				for (const tk of map.tokens) {
					tk.X += left
					tk.Y += up
				}
				
				// initialize and fill a new color array
				const newc = Array(w)

				for (let x = 0; x < w; x++)
					newc[x] = Array(h).fill(0xFFFFFF)

				// get colors from olf tile array
				for (let x = 0; x < map.width; x++)
				{
					let newx = x + left;
					
					if(newx < 0 || newx >= w)
						continue;

					for (let y = 0; y < map.height; y++)
					{
						let newy = y + up;

						if(newy < 0 || newy >= h)
							continue;

						newc[newx][newy] = map.colors[x][y];
					}
				}

				map.colors = newc
				map.width = w
				map.height = h
			},
			checkReceived: function(){},
			checkSent: function(left,right,down,up,force) {
				if(map.width + left + right == 0 || map.height + up + down == 0)
					return "Refusing setsize that would make area 0";
			},
			modifies: mapFields.size,
		},

		SetHidden: {
			receive: function(x, y, h) {
				tokenAt(x, y).Hidden = h
			},
			check: function(x, y, h) {
				if(tokenAt(x, y) === null)
					return "Refusing SetHidden without token"
			},
			modifies: mapFields.tokens
		},

		SetSpawnZone: {
			receive: function(sx, sy, ex, ey) {
				if(sx == sy && sy == ex && ex == ey && ey == -1)
					map.spawn = null;
				else
					map.spawn = shape.new("mask", v(sx, sy), v(ex, ey));
			},
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
			return console.error(err.toString());
		});

		connection.onclose = function(err) {
			alert("Connection lost.\nPlease refresh\n");
			return console.error(err.toString());
		}

		for (const command in this.commands) {
			/** @type {command} */
			const cmd = this.commands[command]
			// convert command name from PascalCase to camelCase
			const ccname = command[0].toLowerCase() + command.substring(1);


			this.connection.on(command, function() {
				try
				{
					const args = cmd.sendsObject ? Array.from(arguments).map(JSON.parse) : arguments
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
			
			this[ccname] = function() {
				const ck = cmd.checkSent ?  cmd.checkSent(...arguments) : cmd.check(...arguments)

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
						console.log("Refusing ", ccname);
					break;
				}

				if(command.startsWith("Move"))
					mapInterface.onMapUpdate(mapFields.tokens);
			}
		}

	}
}

maphub.init();
