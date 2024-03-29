using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;
using battlemap.Util;
using System.Collections;
using Newtonsoft.Json.Linq;

namespace battlemap.Models
{
	public class Map
    {
		/* The size of Cells */
		public const int CellSize = 150;

#region Fields
		/* Stores the tile colors as rgb (no alpha channel) values. Indexing goes X,Y*/
		[JsonIgnore]
		public int[,] Colors;

		/* Stores the tokens on the map. */
		public List<Token> Tokens;

		public List<Effect> Effects;

		public MapSettings Settings;

		public string RtxInfo = "{ globallight: 2, sources: {}, opaque: [] }";

		/* Maps token names to texture IDs */
		public Dictionary<string, string> Sprites;

		[JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
		public Shape SpawnZone;

#endregion

#region Properties
		/* The width of the map */
		public int Width
			=> Colors.GetLength(0);

		/* The height of the map */
		public int Height
			=> Colors.GetLength(1);

		[JsonIgnore]
		public (int width, int height) Size
			=> (Width, Height);

		/* Expresses the Colors data as a base64 string for neater serialization. */
		public string CompactColors
		{
			get
				=> System.Convert.ToBase64String(Colors
							.Unwrap()
							.SelectMany(col => col
								.SelectMany(c => new[]{ (c & 0xFF0000) >> 16, (c & 0xFF00) >> 8, c & 0xFF }))
							.Select(i => (byte)i)
							.ToArray());

			set
			{
				int i = 0, j = 0;

				foreach (var c in System.Convert.FromBase64String(value).Granulate(3))
				{
					Colors[i, j++] = (c[0] << 16) | (c[1] << 8) | c[2];

					if(j == Height)
					{
						j = 0;
						i++;
					}
				}
			}
		}
#endregion

#region Methods
		public Token TokenAtExact(int x, int y)
			=> Tokens.FirstOrDefault(t => t.X == x && t.Y == y);

		/* Finds all tokens that occupy any part of the given rectangle */
		public IEnumerable<Token> TokensAt(((int x, int y) pos, (int w, int h) size) rect)
			=> TokensAt(rect.pos, rect.size);

		/* Finds all tokens that occupy any part of the given rectangle */
		public IEnumerable<Token> TokensAt((int x, int y) position, (int w, int h) size)
			=> Tokens.Where(t => t.Hitbox.Intersects((position, size)));

		public async Task<bool> Spawn(string name, string id)
		{
			Token[] relevant = Tokens.Where(tk => SpawnZone.Contains(tk)).ToArray();
			var b = SpawnZone.Bounds;

			for (int x = b.min.x; x <= b.max.x; x++)
			{
				for (int y = b.min.y; y <= b.max.y; y++)
				{
					if(relevant.Any(tk => tk.Hitbox.Intersects(x, y, 1, 1)))
						continue;

					Token tk = new Token(name, x, y, 1, 1);
					Tokens.Add(tk);
					await Startup.MapHubContext.Clients.Group(id).SendCoreAsync("AddToken", new object[]{ tk.ToJson() });

					return true;
				}
			}

			return false;
		}

		public (MapFields flags, string json) FieldData(MapFields fields)
		{
			var data = new Dictionary<string, object>();
			MapFields flags = 0;

			if(fields.HasFlag(MapFields.Size))
			{
				data["width"] = Width;
				data["height"] = Height;
				flags |= MapFields.Size;
			}
			if(fields.HasFlag(MapFields.Tokens))
			{
				data["tokens"] = Tokens;
				flags |= MapFields.Size;
			}
			if(fields.HasFlag(MapFields.Effects))
			{
				data["effects"] = Effects;
				flags |= MapFields.Effects;
			}
			if(fields.HasFlag(MapFields.Spawn))
			{
				data["spawn"] = SpawnZone;
				flags |= MapFields.Spawn;
			}
			if(fields.HasFlag(MapFields.Settings))
			{
				data["settings"] = Settings;
				flags |= MapFields.Settings;
			}
			if(fields.HasFlag(MapFields.Colors))
			{
				data["colors"] = Colors;
				flags |= MapFields.Colors;
			}
			if(fields.HasFlag(MapFields.Sprites))
			{
				data["sprites"] = Sprites;
				flags |= MapFields.Sprites;
			}
			if(fields.HasFlag(MapFields.RtxInfo))
			{
				data["rtxInfo"] = JObject.Parse(RtxInfo);
				flags |= MapFields.RtxInfo;
			}

			return (flags, data.ToJson());
		}

		public string CanApply(Shape shape, TokenDelta delta)
		{
			// TODO: optimize
			BitArray covered = new BitArray(Width * Height);
			bool movedAny = false;

			foreach (var tk in Tokens)
			{
				var hb = tk.Hitbox;

				if(shape.Contains(hb))
				{
					movedAny = true;
					hb = delta.Apply(hb);
				}

				foreach (var p in hb.GetRectPoints())
				{
					int i = p.x + p.y * Width;

					if(Outside(p))
						return "Out of bounds";
					if(covered[i])
						return "Tokens would collide";

					covered[i] = true;
				}
			}

			if(!movedAny)
				return "No tokens given";

			return null;
		}

		public void Apply(Shape shape, TokenDelta delta)
		{
			foreach (var tk in Tokens)
			{
				if(shape.Contains(tk))
					delta.Apply(tk);
			}
		}

#region Outside Overloads
		/* Determines if any part of the rectangle is outside of the map */
		public bool Outside((int x, int y) position, (int w, int h) size)
			=> position.x < 0 || position.y < 0 || position.x + size.w > Width || position.y + size.h > Height;

		public bool Outside(((int x, int y) pos, (int w, int h) siz) rect)
			=> Outside(rect.pos, rect.siz);

		/* Determines if any part of the rectangle is outside of the map */
		public bool Outside(int x, int y, int w, int h)
			=> Outside((x,y), (w,h));

		/* Determines if the coordinate is outside of the map */
		public bool Outside(int x, int y)
			=> Outside((x,y),(1,1));

		/* Determines if the position is outside of the map */
		public bool Outside((int x, int y) position)
			=> Outside(position, (1,1));
#endregion
#endregion

#region Constructors
		public Map()
		{
			this.Tokens = new List<Token>();
			this.Colors = new int[20, 20].Fill2(0xFFFFFF);
			this.Sprites = new Dictionary<string, string>();
			this.Effects = new List<Effect>();
			this.Settings = new MapSettings(1,1);
		}

		[JsonConstructor]
		// TODO: fix this mess
		public Map(
			List<Token> Tokens,
			// No longer required, replaced by Sprites
			Dictionary<string, string[]> CompactImages,
			string CompactColors,
			int Width, int Height,
			int Sqrt2Numerator, int Sqrt2Denominator,
			List<Effect> Effects,
			Shape SpawnZone,
			Dictionary<string, string> Sprites,
			MapSettings Settings,
			string RtxInfo)
		{
			this.Colors = new int[Width, Height].Fill2(0xFFFFFF);

			if(Settings is null)
				this.Settings = new MapSettings(Sqrt2Numerator, Sqrt2Denominator);
			else
				this.Settings = Settings;

			this.Tokens = Tokens ?? new List<Token>();
			this.Effects = Effects ?? new List<Effect>();
			this.Sprites = Sprites ?? new Dictionary<string, string>();

			if(CompactColors != null)
				this.CompactColors = CompactColors;

			this.SpawnZone = SpawnZone;

			if(!(RtxInfo is null))
				this.RtxInfo = RtxInfo;
		}

		public Map(Map copy)
		{
			this.Colors = (int[,])copy.Colors.Clone();
			this.Tokens = copy.Tokens.Select(t => new Token(t)).ToList();
			this.Effects = copy.Effects.Select(t => new Effect(t)).ToList();

			foreach (var img in copy.Sprites.Values)
				State.Textures[img].ReferenceCount++;

			this.Sprites = new Dictionary<string, string>(copy.Sprites);
			this.Settings = copy.Settings;
		}
#endregion
    }
}
