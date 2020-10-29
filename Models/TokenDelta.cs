
using System.Linq;
using Newtonsoft.Json;
using battlemap.Util;

namespace battlemap.Models
{
	/* Encapsulates possible modificaitons to a token object. */
	public class TokenDelta
	{
		public Vec2<int> move;
		public bool? hidden;

		public void Apply(Token tk)
		{
			if(move != (0,0))
				tk.Position = tk.Position.Add(move);
			if(hidden.HasValue)
				tk.Hidden = hidden.Value;
		}

		public ((int x, int y) pos, (int w, int h) siz) Apply(((int x, int y) pos, (int w, int h) siz) r)
			=> (r.pos.Add(move), r.siz);

		[JsonIgnore]
		public bool IsEmpty
			=> move == (0, 0) && !hidden.HasValue;
	}
}