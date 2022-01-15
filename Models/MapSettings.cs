using System;

namespace battlemap.Models
{
	// defines operator == or operator != but does not override Object.Equals(object o)
	#pragma warning disable 0660
	// defines operator == or operator != but does not override Object.GetHashCode() 
	#pragma warning disable 0661
	
	public class MapSettings
	{
		/* The numerator of the fraction used to approximate √2 */
		public int Sqrt2Numerator;
		/* The denominator of the fraction used to approximate √2 */
		public int Sqrt2Denominator;
		/* What unit the ruler displays */
		public string DistanceUnit = "5'";

		public static bool operator !=(MapSettings l, MapSettings r)
			=> !(l == r);
		
		public static bool operator ==(MapSettings l, MapSettings r)
		{
			if(l is null && r is null)
				return true;
			else if(l is null || r is null)
				return false;

			return l.Sqrt2Denominator == r.Sqrt2Denominator && l.Sqrt2Numerator == r.Sqrt2Numerator && l.DistanceUnit == r.DistanceUnit;
		}

		public MapSettings(int num, int denom, string distanceUnit = "5'")
		{
			this.Sqrt2Denominator = denom;
			this.Sqrt2Numerator = num;

			if(num < 1 || denom < 1)
				throw new ArgumentException("numerator and denominator must be positive");
		}

		public MapSettings() : this(1,1)
		{}

		public MapSettings(MapSettings copy)
		{
			this.Sqrt2Denominator = copy.Sqrt2Denominator;
			this.Sqrt2Numerator = copy.Sqrt2Numerator;	
		}
	}
}