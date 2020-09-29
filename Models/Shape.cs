
using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using battlemap.Util;

namespace battlemap.Models
{
	// Doesn't use polymorphism because it'd need a custom JSON parser function
	public class Shape
	{
#region Fields
		[JsonProperty("start")]
		public Vec2<int> Start;
		
		[JsonProperty("end")]
		public Vec2<int> End;

		[JsonConverter(typeof(StringEnumConverter), true)]
		[JsonProperty("kind")]
		public ShapeKind Kind;
#endregion

#region Properties
		[JsonIgnore]
		public bool Empty
			=> this.Kind != ShapeKind.Mask && Start == End;

		[JsonIgnore]
		private (int x, int y) diff
			=> End.Tuple.Sub(Start);

		[JsonIgnore]
		public ((int x, int y) min, (int x, int y) max)? Bounds
		{
			get
			{
				switch(Kind)
				{
					case ShapeKind.Line:
						return Vectors.Bounds(Start, End);

					case ShapeKind.Mask:
					{
						var b = bounds;
						return ((b.l, b.b), (b.r, b.t));
					}

					default:
						return null;
				}
			}
		}
#endregion

#region Circle Members
		private bool circleContains(int x, int y)
		{
			var r = Math.Floor(diff.Length());
			return r * r >= (x,y).Add(0.5).Sub(Start).SquaredLength();
			//return r * r >= Math.Pow(x + 0.5 - Start.x, 2) + Math.Pow(y + 0.5 - Start.y, 2);
		}

		private bool circleContains(int x, int y, int w, int h)
			=> Contains(((x,y), (w,h)).Nearest(Start));
#endregion

#region Cone Members
		private bool coneContains(int _x, int _y)
		{
			double x = _x + 0.5;
			double y = _y + 0.5;

			(double x, double y) a1 = Start.Tuple.Add(0.5);
			
			var end = End.Tuple.Add(0.5);

			if(diff == (0,0))
				return false;

			var ov = diff.Orth().Norm().Mul(diff.Length() / 2);

			(double x, double y) a2 = end.Add(ov);
			(double x, double y) a3 = end.Sub(ov);


			var d = ((a2.y - a3.y)*(a1.x - a3.x) + (a3.x - a2.x)*(a1.y - a3.y));
			var a = ((a2.y - a3.y)*(x - a3.x) + (a3.x - a2.x)*(y - a3.y)) / d;
			var b = ((a3.y - a1.y)*(x - a3.x) + (a1.x - a3.x)*(y - a3.y)) / d;
			var c = 1 - a - b;

			return 0 <= a && a <= 1 && 0 <= b && b <= 1 && 0 <= c && c <= 1;
		}

#endregion

#region Mask Members
		[JsonIgnore]
		private (int l, int r, int b, int t) bounds
			=> ( Math.Min(Start.x, End.x), Math.Max(Start.x, End.x),
				Math.Min(Start.y, End.y), Math.Max(Start.y, End.y) );

		private bool maskContains(int x, int y)
		{
			var r = bounds;
			return x >= r.l && x <= r.r && y >= r.b && y <= r.t;
		}

		private bool maskContains(int x, int y, int w, int h)
		{
			var r = bounds;
			return (x <= r.r) && (r.l < x + w) && (y <= r.t) && (r.b < y + h);
		}
#endregion

#region Line Members
		private bool lineContains(int _x, int _y)
		{
			double x = _x + 0.5;
			double y = _y + 0.5;

			(double x, double y) p = Start.Tuple.Add(0.5),
								 q = End.Tuple.Add(0.5);

			var vl = diff.Length();
			var d = (diff.y * x - diff.x * y + q.x * p.y - q.y * p.x) / vl;

			//Console.WriteLine($"({x}, {y}): d: {d}");

			if(d > 0.5 || d < -0.5)
				return false;

			(double x, double y) b = (x,y).Sub(diff.Orth().Norm().Mul(d)).Sub(p);
			double f = (diff.x != 0) ? b.x / diff.x : b.y / diff.y;

			//Console.WriteLine($"({x}, {y}): f: {f}");

			return f > 0 && f <= 1;
		}
#endregion

#region Cube Members
		private bool cubeContains(int _x, int _y)
		{
			double x = _x + 0.5;
			double y = _y + 0.5;

			(double x, double y) p = Start.Tuple.Add(0.5),
								 q = End.Tuple.Add(0.5);

			var vl = diff.Length();
			var d = (diff.y * x - diff.x * y + q.x * p.y - q.y * p.x) / (vl * vl);

			//Console.WriteLine($"({x}, {y}): d: {d}");

			if(d > 0.5 || d < -0.5)
				return false;

			(double x, double y) b = (x,y).Sub(diff.Orth().Norm().Mul(d * vl)).Sub(p);
			double f = (diff.x != 0) ? b.x / diff.x : b.y / diff.y;

			//Console.WriteLine($"({x}, {y}): f: {f}");

			return f > 0 && f <= 1;
		}
#endregion

#region Contains() overloads
		public bool Contains((int x, int y) point)
			=> Contains(point.x, point.y);

		public bool Contains(int x, int y)
		{
			switch(Kind)
			{
				case ShapeKind.Circle:
					return circleContains(x, y);

				case ShapeKind.Mask:
					return maskContains(x,y);

				case ShapeKind.Cone:
					return coneContains(x,y);

				case ShapeKind.Line:
					return lineContains(x,y);

				case ShapeKind.Cube:
					return cubeContains(x,y);

				default:
					throw new NotImplementedException();
			}
		}

		public bool Contains(((int x, int y) pos, (int w, int h) siz) rect)
			=> Contains(rect.pos.x, rect.pos.y, rect.siz.w, rect.siz.h);

		public bool Contains((int x, int y) point, (int w, int h) size)
			=> Contains(point.x, point.y, size.w, size.h);


		public bool Contains(int x, int y, int w, int h)
		{
			if(Bounds.TryGet(out var v)
				&& ((x > v.max.x) || (v.min.x >= x + w) || (y > v.max.y) || (v.min.y >= y + h)))
				return false;
			
			switch(Kind)
			{
				case ShapeKind.Circle:
					return circleContains(x, y, w, h);

				case ShapeKind.Mask:
					return maskContains(x,y,w,h);

				default:
					for (int i = 0; i < w; i++)
					{
						for (int j = 0; j < h; j++)
						{
							if(Contains(x + i, y + j))
								return true;
						}
					}

					return false;
			}
		}

		public bool Contains(Token tk)
			=> Contains(tk.Hitbox);

		public override bool Equals(object obj)
		{
			return obj is Shape shape &&
				   Start.Equals(shape.Start) &&
				   End.Equals(shape.End) &&
				   Kind == shape.Kind;
		}

		public override int GetHashCode()
		{
			return HashCode.Combine(Start, End, Kind);
		}
		#endregion

#region operators
		public static bool operator ==(Shape l, Shape r)
			=> (l is null && r is null)
				|| (!(l is null) && !(r is null)
					&& l.Kind == r.Kind && l.Start == r.Start
					&& ((l.Kind == ShapeKind.Circle)
					? l.diff.SquaredLength() == r.diff.SquaredLength()
					: l.End == r.End));

		public static bool operator !=(Shape l, Shape r)
			=> !(l == r);
#endregion

		[JsonConstructor]
		public Shape()
		{}

		public Shape(ShapeKind kind, (int x, int y) start, (int x, int y) end)
		{
			this.Kind = kind;
			this.Start = start;
			this.End = end;
		}

		public Shape(Shape clone)
		{
			this.Start = clone.Start;
			this.End = clone.End;
			this.Kind = clone.Kind;
		}
	}
}