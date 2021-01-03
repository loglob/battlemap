using battlemap.Util;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace battlemap.Models
{
	public class Effect
	{
		[JsonIgnore]
		public readonly Shape Shape;

		[JsonProperty("color")]
		public readonly int Color;

		[JsonProperty("kind")]
		[JsonConverter(typeof(StringEnumConverter), true)]
		public ShapeKind Kind
			=> Shape.Kind;

		[JsonProperty("start")]
		public Vec2<int> Start
		{
			get => Shape.Start;
			set => Shape.Start = value;
		}

		[JsonProperty("end")]
		public Vec2<int> End
		{
			get => Shape.End;
			set => Shape.End = value;
		}

		public static implicit operator Shape(Effect e)
			=> e.Shape;

		[JsonConstructor]
		public Effect(ShapeKind kind, Vec2<int> start, Vec2<int> end, int color)
		{
			this.Shape = Shape.From(kind, start, end);
			this.Color = color;
		}

		public Effect(Effect clone)
		{
			this.Shape = Shape.Clone(clone.Shape);
			this.Color = clone.Color;
		}
	}
}