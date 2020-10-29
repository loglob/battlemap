
using battlemap.Util;

namespace battlemap.Models.Shapes
{
	class Circle : Shape
	{
		public override ShapeKind Kind
			=> ShapeKind.Circle;

		protected override ((int x, int y) min, (int x, int y) max) GetBounds()
		{
			var c = Start.Tuple;
			double r = diff.Length();
			
			return (c.Add(-r).RoundAwayFrom(c), c.Add(r).RoundAwayFrom(c));
		}

		public override bool Contains(int x, int y)
			=> (x,y).Sub(Start).SquaredLength() <= diff.SquaredLength();

		public Circle(Vec2<int> start, Vec2<int> end) : base(start, end)
		{}
	}
}