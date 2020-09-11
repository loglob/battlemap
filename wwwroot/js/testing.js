// testing.js: Testing data for proper type recognition in the IDE

const map = {
	/* The id/token of this map */
	id:	"DEBUG",
	width:	5,
	height:	5,
	// int[][]
	colors: [
		[ 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF ],
		[ 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF ],
		[ 0xFFFFFF, 0x00FFFF, 0xFF00FF, 0xFFFF00, 0xFFFFFF ],
		[ 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF ],
		[ 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF, 0xFFFFFF ],
	],
	// (int Height, string Name, int Width, int X, int Y)[]
	tokens: [ { Name: "Foo", X: 1, Y:1, Width:3, Height:3, Hidden: false } ],
	settings: {
		Sqrt2Denominator: 3,
		Sqrt2Numerator: 2,
	},
	effects: [
		{ color:0xFF0000, kind: "circle", start: { x: 3, y: 3 }, end: { x: 5, y: 3 } },
		{ color:0x00FF00, kind: "mask", start: { x: 1, y: 1}, end: { x: 2, y: 2 } }
	],
	spawn: null,
	sprites: {
		"Foo" : "fsnfsafnjskfe"
	}
}

const cellSize = 150
const huburl = "/mapHub?token=DEBUG"
var w = cellSize * map.Width
var h = cellSize * map.Height
const isDM = true
const imageHint = [ "foobar" ]