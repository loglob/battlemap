using Newtonsoft.Json;

namespace battlemap.Models
{
	public class Image
    {
#region Fields
		[JsonIgnore]
		private int referenceCount = 0;
		[JsonIgnore]
		private int? hashCode;

		public const int TokenLength = 20;

		[JsonIgnore]
		public byte[] Data;
		[JsonIgnore]
		public string Url;

		// null for redirect, any other string is a HTTP content type.
		public string Type;
#endregion

#region Properties
		[JsonProperty("data")]
		public string CompactData
			=> Url ?? System.Convert.ToBase64String(Data);

		[JsonIgnore]
		public bool IsRedirect
			=> Type == null;

		[JsonIgnore]
		public int ReferenceCount
		{
			get => referenceCount;
			set
			{
				referenceCount = value;

				if(value <= 0)
					Textures.Delete(this);
			}
		}
#endregion

		[JsonConstructor]
		public Image(string type, string data)
		{
			this.Type = type;

			if(type == null)
				this.Url = data;
			else
				this.Data = System.Convert.FromBase64String(data);
		}

		public Image(string type, byte[] data)
		{
			this.Type = type;
			this.Data = data;
		}

		public Image(string url)
		{
			this.Type = null;
			this.Url = url;
		}

		private int getHashCode()
		{
			if(IsRedirect)
				return Url.GetHashCode();

			int h = 0;

			// Naive hashing (since the digest is so small a proper hash makes no sense)
			for (int i = 0; i < Data.Length; i++)
				h ^= Data[i] << 8 * (i % 4);

			return h;
		}

		public override int GetHashCode()
		{
			if(!hashCode.HasValue)
				hashCode = getHashCode();

			return hashCode.Value;
		}

		public static bool operator !=(Image l, Image r)
			=> !(l == r);

		public static bool operator ==(Image l, Image r)
		{
			if(l.Type != r.Type)
				return false;
			if(l.IsRedirect)
				return l.Url == r.Url;
			if(l.Data.Length != r.Data.Length)
				return false;

			for (int i = 0; i < l.Data.Length; i++)
			{
				if(l.Data[i] != r.Data[i])
					return false;
			}

			return true;
		}

		public override bool Equals(object obj)
			=> (obj is Image img) && this == img;
	}
}