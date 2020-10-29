
using battlemap.Util;

namespace battlemap.Models.Shapes
{
	class Cone : ConvexShape
	{

		public override ShapeKind Kind
			=> ShapeKind.Cone;

		protected override (double x, double y)[] GetVertices()
		{
			var e = End.Tuple.Add(0.5);
			var ov = diff.Orth().Mul(0.5);
			
			return new (double x, double y)[]{ e.Add(ov), Start.Tuple.Add(0.5), e.Sub(ov) };
		}

		public Cone(Vec2<int> start, Vec2<int> end) : base(start, end)
		{}
	}
}