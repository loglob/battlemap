
using battlemap.Util;

namespace battlemap.Models.Shapes
{
	class Mask : Shape
	{
		public bool isPoint
			=> this.Start == this.End;

		public override ShapeKind Kind
			=> ShapeKind.Mask;

		public override bool IsEmpty
			=> false;

		protected override ((int x, int y) min, (int x, int y) max) GetBounds()
			=> Vectors.Bounds(Start, End);
			
		public override bool Contains(int x, int y)
			=> x >= Bounds.min.x && x <= Bounds.max.x && y >= Bounds.min.y && y <= Bounds.max.y;
		
		public override bool Contains(int x, int y, int w, int h)
			=> (x <= Bounds.max.x) && (Bounds.min.x < x + w) && (y <= Bounds.max.y) && (Bounds.min.y < y + h);

		public Mask(Vec2<int> start, Vec2<int> end) : base(start, end)
		{}
	}
}