
using System.Buffers.Text;
using System.Text;
using Newtonsoft.Json;

namespace battlemap.Models
{
	public class Image
    {
#region Fields
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
	}
}