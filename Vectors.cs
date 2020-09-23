
using System;

namespace battlemap
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