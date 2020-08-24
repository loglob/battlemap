using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace battlemap.Models
{
	public class Effect : Shape
	{

		[JsonProperty("color")]
		public int Color;

		[JsonIgnore]
		public Shape Shape
			=> this;

		[JsonConstructor]
		public Effect()
		{ }

		public Effect(ShapeKind kind, (int x, int y) start, (int x, int y) end, int color) : base(kind, start, end)
		{
			this.Color = color;
		}

		public Effect(Effect clone) : base(clone)
		{
			this.Color = clone.Color;
		}
	}
}