#version 300 es

precision mediump float;
precision mediump sampler2D;

// area of the map
uniform ivec2 size;
// obstruction map boolean texture. Only red channel is used
uniform lowp sampler2D map;

// uniform int maxPathlen = size.x + size.y;

// Whether line of sight is enabled
uniform bool lineOfSight;
// The player's position. Only relevant is lineOfSight is true
uniform vec2 player;


// The properties of light sources. 3 channels, z stores light range. y selects brightness (bright=0).
uniform sampler2D lights;
// how many bright lights there are; width of lights[_,0]
uniform int bright_count;
// how many dim lights there are; width of lights[_,1]
uniform int dim_count;

// Whether global lighting is set to dim (bright is handled elsewhere)
uniform bool globalDim;

// how deep light penetrates opqaue tiles
const float pen_depth = .2;
// The alpha with which dim light is rendered
const float dim_alpha = .4;


// Fragment coordinate in map space
in vec2 map_pos;
out vec4 fragColor;

bool opaque(ivec2 p)
{
	// flip p because the obsmap is stored column-major
	return texelFetch(map, p.yx, 0).r != 0.0;
}

// Whether there is a line connecting start and end without hitting any walls
bool line(vec2 start, vec2 end)
{
	vec2 d = end - start;
	// which direction d steps in
	vec2 ds = sign(d);
	ivec2 endTile = ivec2(end);

	vec2 cur = start;

	for(int i = 0; i < size.x+size.y; i++)
	{
		ivec2 tile = ivec2(cur);

		if(tile == endTile)
			break;

		if(opaque(tile))
		// TODO: light penetration
			return false;

		// position inside of tile
		vec2 icur = cur - vec2(tile);

		// step to next tile
		if(ds.x == .0 || ds.y == .0)
			cur += ds;
		else
		{
			// step distance to next 'wall', corrected for stepping direction
			vec2 dw = ( vec2(greaterThanEqual(ds, vec2(0))) - ds*icur) / abs(d);
			cur += (min(dw.x, dw.y) + .01) * d;
		}
	}

	return true;
}

// Checks whether the distance between a & b is less than dist
bool distance_lt(vec2 a, vec2 b, float dist)
{
	vec2 c = a - b;
	return dist*dist > dot(c,c);
}

void main()
{
	fragColor = vec4(.0,.0,.0, globalDim ? dim_alpha : 1.0);

	ivec2 tile = ivec2(map_pos);

	if(opaque(tile))
		return;

	// check line of sight
	if(lineOfSight && !line(map_pos, player))
		return;

	for(int b = 0; b < bright_count; b++)
	{
		vec4 light = texelFetch(lights, ivec2(b,0), 0);
		// cull more agressively if pixel is already dimly lit
		bool dim = fragColor.w < 1.0;

		if(distance_lt(light.xy, map_pos, (dim ? 1.0 : 2.0) * light.z) && line(light.xy, map_pos))
		{ // pixel is brightly illuminated, no further computation needed
			if(dim || distance_lt(light.xy, map_pos, light.z))
			{
				fragColor.w = 0.0;
				return;
			}
			else
				fragColor.w = dim_alpha;
		}
	}

	if(fragColor.w < 1.0)
		return;

	for(int d = 0; d < dim_count; d++)
	{
		vec4 light = texelFetch(lights, ivec2(d,1), 0);

		if(distance_lt(light.xy, map_pos, light.z) && line(light.xy, map_pos))
		{ // pixel is dimly illuminated, no further computation needed
			fragColor.w = dim_alpha;
			return;
		}
	}
}