using System;

namespace battlemap.Models
{
	// defines operator == or operator != but does not override Object.Equals(object o)
	#pragma warning disable 0660
	// defines operator == or operator != but does not override Object.GetHashCode() 
	#pragma warning disable 0661
	
	public record MapSettings(int Sqrt2Numerator, int Sqrt2Denominator, string DistanceUnit = "5'");
}