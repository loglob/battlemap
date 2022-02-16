using Newtonsoft.Json;
using battlemap.Util;

namespace battlemap.Models
{
	/* Encapsulates possible modifications to a token object. */
	public class TokenDelta
	{
		public Vec2<int> move;
		public int conditionsAdd;
		public int conditionsSub;
		public bool turn;

		public void Apply(Token tk)
		{
			if(conditionsAdd != 0)
				tk.Conditions |= conditionsAdd;
			if(conditionsSub != 0)
				tk.Conditions &= ~conditionsSub;
			if(move != (0,0) || turn)
				tk.Hitbox = Apply(tk.Hitbox);
		}

		public ((int x, int y) pos, (int w, int h) siz) Apply(((int x, int y) pos, (int w, int h) siz) r)
			=> (r.pos.Add(move), turn ? r.siz.Swap() : r.siz);

		[JsonIgnore]
		public bool IsEmpty
			=> move == (0, 0) && conditionsAdd == 0 && conditionsSub == 0 && !turn;
	}
}