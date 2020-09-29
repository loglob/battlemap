
using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace battlemap.Util
{
    public struct Vec2<T>
    {
		public T x, y;

		[JsonIgnore]
		public (T x, T y) Tuple
			=> this;

		public static Vec2<T> Default
			=> new Vec2<T>(default(T), default(T));

		public Vec2(T x, T y)
		{
			this.x = x;
			this.y = y;
		}

		public Vec2((T x, T y) tuple) : this(tuple.x, tuple.y)
		{ }

		public static implicit operator Vec2<T>((T x, T y) t)
			=> new Vec2<T>(t); 

		public static implicit operator (T x, T y)(Vec2<T> t)
			=> (t.x, t.y);

		public static bool operator ==(Vec2<T> l, Vec2<T> r)
		{
			var cmp = EqualityComparer<T>.Default;
			return cmp.Equals(l.x, r.x) && cmp.Equals(l.y, r.y);
		}

		public static bool operator !=(Vec2<T> l, Vec2<T> r)
			=> !(l == r);

		public override bool Equals(object obj)
			=> obj is Vec2<T> u ? (y.Equals(u.y) && y.Equals(u.y)) : base.Equals(obj);
		
		public override int GetHashCode()
			=> HashCode.Combine(x, y);

		public override string ToString()
			=> $"({x},{y})";
		
		public Vec2<Tnew> Map<Tnew>(Func<T,Tnew> f)
			=> new Vec2<Tnew>(f(x), f(y));

		public Vec2<Tnew> Map<T2,Tnew>(Vec2<T2> other, Func<T,T2,Tnew> f)
			=> new Vec2<Tnew>(f(x, other.x), f(y, other.y));
	}
}