using System;
using System.Linq;
using battlemap.Util;

namespace battlemap.Models.Shapes
{
	class Cube : ConvexShape
	{
		public override ShapeKind Kind
			=> ShapeKind.Cube;

		protected override (double x, double y)[] GetVertices()
		{
			var o = diff.Orth().Mul(0.5);
			var s = Start.Tuple.Add(0.5);
			var e = End.Tuple.Add(0.5);

			return new (double x, double y)[]{ s.Add(o), s.Sub(o), e.Sub(o), e.Add(o) };
		}

		public Cube(Vec2<int> start, Vec2<int> end) : base(start, end)
		{}
	}
}