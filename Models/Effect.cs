using battlemap.Util;
using Newtonsoft.Json;

namespace battlemap.Models
{
	public class Effect
	{
		[JsonProperty("shape")]
		public readonly Shape Shape;

		[JsonProperty("color")]
		public readonly int Color;


		[JsonIgnore]
		public ShapeKind Kind
			=> Shape.Kind;

		[JsonIgnore]
		public Vec2<int> Start
		{
			get => Shape.Start;
			set => Shape.Start = value;
		}

		[JsonIgnore]
		public Vec2<int> End
		{
			get => Shape.End;
			set => Shape.End = value;
		}

		public static implicit operator Shape(Effect e)
			=> e.Shape;

		[JsonConstructor]
		public Effect(Shape shape, ShapeKind? kind, Vec2<int>? start, Vec2<int>? end, int color)
		{
			this.Shape = shape ?? Shape.From(kind.Value, start.Value, end.Value);
			this.Color = color;
		}

		public Effect(Effect clone)
		{
			this.Shape = Shape.Clone(clone.Shape);
			this.Color = clone.Color;
		}
	}
}