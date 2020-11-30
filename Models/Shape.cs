using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using battlemap.Models.Shapes;
using battlemap.Util;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace battlemap.Models
{
	[JsonConverter(typeof(battlemap.Models.Shapes.ShapeConverter))]
	[JsonObject(MemberSerialization.OptIn)]
	abstract public class Shape
	{
#region Fields
		[JsonProperty("start")]
		public readonly Vec2<int> Start;
		
		[JsonProperty("end")]
		public readonly Vec2<int> End;

		private ((int x, int y) min, (int x, int y) max)? bounds;
#endregion

#region Properties
		[JsonConverter(typeof(StringEnumConverter), true)]
		[JsonProperty("kind")]
		[Pure]
		public abstract ShapeKind Kind
		{ get; }

		public ((int x, int y) min, (int x, int y) max) Bounds
			=> bounds ?? (bounds = GetBounds()).Value;
		
		[Pure]
		public virtual IEnumerable<(int x, int y)> Points
			=> Bounds.GetBoundsPoints().Where(Contains);

		[Pure]
		public virtual bool IsEmpty
			=> Start == End;

		[Pure]
		protected (int x, int y) diff
			=> Start.Tuple.Sub(End);
#endregion

#region Methods
		protected abstract ((int x, int y) min, (int x, int y) max) GetBounds();

		[Pure]
		public abstract bool Contains(int x, int y);

		[Pure]
		public virtual bool Contains(int x, int y, int w, int h)
			=> ((x,y),(x+w-1,y+h-1))
				.Intersection(Bounds)
				.GetBoundsPoints()
				.Any(Contains);

		[Pure]
		public bool Contains((int x, int y) p)
			=> Contains(p.x, p.y);
			
		[Pure]
		public bool Contains((int x, int y) pos, (int w, int h) siz)
			=> Contains(pos.x, pos.y, siz.w, siz.h);

		[Pure]
		public bool Contains(((int x, int y) pos, (int w, int h) siz) hitbox)
			=> Contains(hitbox.pos.x, hitbox.pos.y, hitbox.siz.w, hitbox.siz.h);
			
		[Pure]
		public bool Contains(Token tk)
			=> Contains(tk.X, tk.Y, tk.Width, tk.Height);

		public override bool Equals(object obj)
			=> obj is Shape s && s == this;

		public override int GetHashCode()
			=> HashCode.Combine(Start, End, Kind);

		public static bool operator !=(Shape l, Shape r)
			=> !(l == r);

		public static bool operator ==(Shape l, Shape r)
		{
			if(l is null && r is null)
				return true;
			if(l is null || r is null)
				return false;

			return l.Kind == r.Kind && l.Start == r.Start && l.End == r.End;
		}

		public static Shape Clone(Shape clone)
			=> From(clone.Kind, clone.Start, clone.End);

		public static Shape From(ShapeKind kind, Vec2<int> start, Vec2<int> end)
		{
			switch(kind)
			{
				case ShapeKind.Circle:
					return new Circle(start, end);

				case ShapeKind.Cone:
					return new Cone(start, end);

				case ShapeKind.Cube:
					return new Cube(start, end);

				case ShapeKind.Line:
					return new Line(start, end);

				case ShapeKind.Mask:
					return new Mask(start, end);
					
				default:
					throw new InvalidOperationException($"Invalid shape kind: {kind}");
			}
		}
#endregion
	
		protected Shape(Vec2<int> start, Vec2<int> end)
		{
			this.Start = start;
			this.End = end;
		}
	}
}