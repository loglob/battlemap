using System.Diagnostics.Contracts;
using System.Linq;
using battlemap.Util;

namespace battlemap.Models.Shapes
{
	abstract class ConvexShape : Shape
	{
		[Pure]
		abstract protected (double x, double y)[] GetVertices();
		[Pure]
		virtual protected (double x, double y) GetCenter()
			=> Start.Tuple.Add(diff.Mul(0.5));

		private (double x, double y)[] vertices;
		private (double x, double y)? center;


		public (double x, double y)[] Vertices
			=> vertices ?? (vertices = GetVertices());
		public (double x, double y) Center
			=> center ?? (center = GetCenter()).Value;

		protected override ((int x, int y) min, (int x, int y) max) GetBounds()
			=> Vectors.Bounds(Vertices.Select(v => v.RoundAwayFrom(Center)));

		public override bool Contains(int x, int y)
		{
			for (int i = 0; i < Vertices.Length; i++)
			{
				var a = Vertices[i];
				var b = Vertices[(i + 1) % Vertices.Length];
				
				if((b.x - a.x) * (y + 0.5 - a.y) - (x + 0.5 - a.x) * (b.y - a.y) < 0)
					return false;
			}

			return true;
		}

		protected ConvexShape(Vec2<int> start, Vec2<int> end) : base(start, end)
		{}
	}
}