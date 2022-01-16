using System;

namespace battlemap.Util
{
    public static class Geometry
	{
		/* Determines if x is in the range defined by start and length */
		public static bool InRange(this int x, int start, int length)
			=> x >= start && x < start + length;

		/* Determines if the coordinate is in the area defined by start and length  */
		public static bool InRange(this (int x, int y) coord, (int a, int b) start, (int a, int b) length)
			=> coord.x.InRange(start.a, length.a) && coord.y.InRange(start.b, length.b);

		/* Finds the point in the range that is nearest to the target */
		public static int Nearest(this (int start, int len) range, int target)
			=> target <= range.start
				? range.start
				: target >= range.start + range.len
					? range.start + range.len - 1
					: target;

		/* Finds the point in the rectange that is nearest to the target point */
		public static (int x, int y) Nearest(this ((int x, int y) pos, (int w, int h) size) rect, (int x, int y) target)
			=> ((rect.pos.x, rect.size.w).Nearest(target.x), (rect.pos.y, rect.size.h).Nearest(target.y));

#region InCircle() overloads
		// Determines if the given point is in the circle with radius r around (x,y)
		public static bool InCircle(this (int x, int y) pos, int x, int y, int r)
			=> r*r >= Math.Pow(pos.x + 0.5 - x, 2) + Math.Pow(pos.y + 0.5 - y, 2);

		// Determines if the given point is in the circle with radius r around c
		public static bool InCircle(this (int x, int y) pos, (int x, int y) c, int r)
			=> pos.InCircle(c.x, c.y, r);

		public static bool InCircle(this ((int x, int y) pos, (int w, int h) size) hitbox, (int x, int y) point, int r)
			=> hitbox.Nearest(point).InCircle(point, r);

		public static bool InCircle(this ((int x, int y) pos, (int w, int h) size) hitbox, int xc, int yc, int r)
			=> hitbox.InCircle((xc, yc), r);
#endregion

		public static bool InRect(this (int x, int y) pos, ((int x, int y) pos, (int w, int h) siz) rect)
			=> rect.pos.x >= pos.x && rect.pos.x + rect.siz.w > pos.x
				&& rect.pos.y >= pos.y && rect.pos.y + rect.siz.h > pos.y;

#region  Intersects() overloads
		/* Determines if two ranges intersect */
		public static bool Intersects(this (int s, int l) r1, (int s, int l) r2)
			=> r1.s < r2.s + r2.l && r2.s < r1.s + r1.l;

		/* Determines if two rectangles intersect */
		public static bool Intersects(this ((int x, int y) c, (int w, int h) s) r1, ((int x, int y) c, (int w, int h) s) r2)
			=> Intersects((r1.c.x, r1.s.w), (r2.c.x, r2.s.w)) && Intersects((r1.c.y, r1.s.h), (r2.c.y, r2.s.h));

		/* Determines if two rectangles intersect */
		public static bool Intersects(this ((int x, int y) pos, (int w, int h) size) hitbox,
			int x, int y, int w, int h)
			=> hitbox.Intersects(((x,y), (w,h)));

		/* Determines if two rectangles intersect */
		public static bool Intersects(this ((int x, int y) pos, (int w, int h) size) hitbox,
			(int x, int y) pos, (int w, int h) size)
			=> hitbox.Intersects((pos, size));
#endregion

	}
}