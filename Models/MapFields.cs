
using System;

namespace battlemap.Models
{
	[Flags]
	public enum MapFields
	{
		Size = 1,
		Tokens = 2,
		Settings = 4,
		Colors = 8,
		Effects = 16,
		Spawn = 32,
		Sprites = 64,
		All = 127
	}
}