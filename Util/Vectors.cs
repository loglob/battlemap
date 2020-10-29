
using System;
using System.Collections.Generic;
using System.Linq;

namespace battlemap.Util
{
	/* Implements Vector Arithmetic with tuples for int and double types */
    public static class Vectors
	{
#region Add() overloads
		public static (int a, int b) Add(this (int a, int b) v, int val)
			=> (v.a + val, v.b + val);
			
		public static (int a, int b) Add(this (int a, int b) v, int a, int b)
			=> (v.a + a, v.b + b);
			
		public static (int a, int b) Add(this (int a, int b) v, (int a, int b) u)
			=> (v.a + u.a, v.b + u.b);

		public static (double a, double b) Add(this (int a, int b) v, double val)
			=> (v.a + val, v.b + val);
			
		public static (double a, double b) Add(this (int a, int b) v, double a, double b)
			=> (v.a + a, v.b + b);
			
		public static (double a, double b) Add(this (int a, int b) v, (double a, double b) u)
			=> (v.a + u.a, v.b + u.b);

		public static (double a, double b) Add(this (double a, double b) v, double val)
			=> (v.a + val, v.b + val);
			
		public static (double a, double b) Add(this (double a, double b) v, double a, double b)
			=> (v.a + a, v.b + b);
			
		public static (double a, double b) Add(this (double a, double b) v, (double a, double b) u)
			=> (v.a + u.a, v.b + u.b);

		public static ((int x, int y) pos, (int w, int h)siz) Add(this ((int x, int y) pos, (int w, int h)siz) rect,
			(int x, int y) dpos)
			=> (rect.pos.Add(dpos), rect.siz);
#endregion

#region Sub() overloads
		public static (int a, int b) Sub(this (int a, int b) v, int val)
			=> (v.a - val, v.b - val);
			
		public static (int a, int b) Sub(this (int a, int b) v, int a, int b)
			=> (v.a - a, v.b - b);
			
		public static (int a, int b) Sub(this (int a, int b) v, (int a, int b) u)
			=> (v.a - u.a, v.b - u.b);

		public static (double a, double b) Sub(this (int a, int b) v, double val)
			=> (v.a - val, v.b - val);
			
		public static (double a, double b) Sub(this (int a, int b) v, double a, double b)
			=> (v.a - a, v.b - b);
			
		public static (double a, double b) Sub(this (int a, int b) v, (double a, double b) u)
			=> (v.a - u.a, v.b - u.b);

		public static (double a, double b) Sub(this (double a, double b) v, double val)
			=> (v.a - val, v.b - val);
			
		public static (double a, double b) Sub(this (double a, double b) v, double a, double b)
			=> (v.a - a, v.b - b);
			
		public static (double a, double b) Sub(this (double a, double b) v, (double a, double b) u)
			=> (v.a - u.a, v.b - u.b);
#endregion

#region Mul() overloads
		public static (int a, int b) Mul(this (int a, int b) v, int val)
			=> (v.a * val, v.b * val);
			
		public static (int a, int b) Mul(this (int a, int b) v, int a, int b)
			=> (v.a * a, v.b * b);
			
		public static (int a, int b) Mul(this (int a, int b) v, (int a, int b) u)
			=> (v.a * u.a, v.b * u.b);

		public static (double a, double b) Mul(this (int a, int b) v, double val)
			=> (v.a * val, v.b * val);
			
		public static (double a, double b) Mul(this (int a, int b) v, double a, double b)
			=> (v.a * a, v.b * b);
			
		public static (double a, double b) Mul(this (int a, int b) v, (double a, double b) u)
			=> (v.a * u.a, v.b * u.b);

		public static (double a, double b) Mul(this (double a, double b) v, double val)
			=> (v.a * val, v.b * val);
			
		public static (double a, double b) Mul(this (double a, double b) v, double a, double b)
			=> (v.a * a, v.b * b);
			
		public static (double a, double b) Mul(this (double a, double b) v, (double a, double b) u)
			=> (v.a * u.a, v.b * u.b);
#endregion

#region Div() overloads
		public static (double a, double b) Div(this (int a, int b) v, double val)
			=> (v.a / val, v.b / val);
			
		public static (double a, double b) Div(this (int a, int b) v, double a, double b)
			=> (v.a / a, v.b / b);
			
		public static (double a, double b) Div(this (int a, int b) v, (double a, double b) u)
			=> (v.a / u.a, v.b / u.b);

		public static (double a, double b) Div(this (double a, double b) v, double val)
			=> (v.a / val, v.b / val);
			
		public static (double a, double b) Div(this (double a, double b) v, double a, double b)
			=> (v.a / a, v.b / b);
			
		public static (double a, double b) Div(this (double a, double b) v, (double a, double b) u)
			=> (v.a / u.a, v.b / u.b);
#endregion

#region SquaresLength()
		public static int SquaredLength(this (int a, int b) v)
			=> v.a * v.a + v.b * v.b;

		public static double SquaredLength(this (double a, double b) v)
			=> v.a * v.a + v.b * v.b;
#endregion

#region Orth()
		public static (double a, double b) Orth(this (double a, double b) v)
			=> (v.b, -v.a);

		public static (int a, int b) Orth(this (int a, int b) v)
			=> (v.b, -v.a);
#endregion

#region Norm()
		public static (double a, double b) Norm(this (double a, double b) v)
			=> v.Div(v.Length());

		public static (double a, double b) Norm(this (int a, int b) v)
			=> v.Div(v.Length());
#endregion

#region Length()
		public static double Length(this (double a, double b) v)
			=> Math.Sqrt(v.a * v.a + v.b * v.b);

		public static double Length(this (int a, int b) v)
			=> Math.Sqrt(v.a * v.a + v.b * v.b);
#endregion

		public static (int x, int y) Min(this (int x, int y) first, params (int x, int y)[] other)
		{
			var cur = first;

			foreach (var v in other)
			{
				if(v.x < cur.x)
					cur.x = v.x;
				if(v.y < cur.y)
					cur.y = v.y;
			}

			return cur;
		}		

		public static (int x, int y) Max(this (int x, int y) first, params (int x, int y)[] other)
		{
			var cur = first;

			foreach (var v in other)
			{
				if(v.x > cur.x)
					cur.x = v.x;
				if(v.y > cur.y)
					cur.y = v.y;
			}

			return cur;
		}		

		public static ((int x, int y) min, (int x, int y) max) Intersection(
			this ((int x, int y) min, (int x, int y) max) bounds, ((int x, int y) min, (int x, int y) max) lim)
			=> (bounds.min.Max(lim.min), bounds.max.Min(lim.max));

		public static IEnumerable<(int x, int y)> GetRectPoints(this ((int x, int y) pos, (int w, int h) siz) rect)
			=> Enumerable.Range(rect.pos.x, rect.siz.w).Zip(Enumerable.Range(rect.pos.y, rect.siz.h));

		public static IEnumerable<(int x, int y)> GetBoundsPoints(this ((int x, int y) min, (int x, int y) max) bounds)
		{
			for (int x = bounds.min.x; x <= bounds.max.x; x++)
				for (int y = bounds.min.y; y <= bounds.max.y; y++)
					yield return (x,y);
		}

		public static (int a, int b) RoundAwayFrom(this (double a, double b) x, (double a, double b) other)
			=> ((int)x.a.RoundAwayFrom(other.a), (int)x.b.RoundAwayFrom(other.b));

		public static ((int x, int y) min, (int x, int y) max) Bounds(this IEnumerable<(int x, int y)> points)
		{
			var lo = points.First();
			var hi = lo;

			foreach (var p in points.Skip(1))
			{
				if(p.x < lo.x)
					lo.x = p.x;
				else if(p.x > hi.x)
					hi.x = p.x;

				if(p.y < lo.y)
					lo.y = p.y;
				else if(p.y > hi.y)
					hi.y = p.y;
			}

			return (lo, hi);
		}

		public static ((int x, int y) min, (int x, int y) max) Bounds((int x, int y) first, params (int x, int y)[] other)
		{
			(int x, int y) min = first, max = first;

			foreach (var v in other)
			{
				if(v.x < min.x)
					min.x = v.x;
				else if(v.x > max.x)
					max.x = v.x;

				if(v.y < min.y)
					min.y = v.y;
				else if(v.y > max.y)
					max.y = v.y;
			}

			return (min, max);
		}
	}
}