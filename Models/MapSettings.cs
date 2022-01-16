namespace battlemap.Models
{
	public record MapSettings(int Sqrt2Numerator, int Sqrt2Denominator, string DistanceUnit = "5'");
}