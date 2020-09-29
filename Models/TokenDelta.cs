
using System.Linq;
using Newtonsoft.Json;
using battlemap.Util;

namespace battlemap.Models
{
	/* Encapsulates possible modificaitons to a token object. */
	public class TokenDelta
	{
		public class Vec2
		{
			public int x, y;

			static public implicit operator (int x, int y)(Vec2 v)
				=> (v.x,v.y);
		}

		public Vec2 move;
		public bool? hidden;

		public void Apply(Token tk)
		{
			if(move != null)
				tk.Position = tk.Position.Add(move);
			if(hidden.HasValue)
				tk.Hidden = hidden.Value;
		}

		[JsonIgnore]
		public bool IsEmpty
			=> (move is null || (move.x == 0 && move.y == 0)) && !hidden.HasValue;
	}
}