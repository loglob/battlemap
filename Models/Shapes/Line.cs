using battlemap.Util;

namespace battlemap.Models.Shapes
{
	class Line : ConvexShape
	{
		public override ShapeKind Kind
			=> ShapeKind.Line;

		protected override (double x, double y)[] GetVertices()
		{
			var o = diff.Orth().Norm().Mul(0.5);
			var s = Start.Tuple.Add(0.5);
			var e = End.Tuple.Add(0.5);

			return new (double x, double y)[]{ s.Add(o), s.Sub(o), e.Sub(o), e.Add(o) };
		}

		public Line(Vec2<int> start, Vec2<int> end) : base(start, end)
		{}
	}
}