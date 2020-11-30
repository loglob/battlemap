using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using battlemap.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using battlemap.Util;
using Newtonsoft.Json;

namespace battlemap.Hubs
{
	public class MapHub : Hub
	{
		/* Represents a connection from a client. */
		private class ConnectionInfo
		{
			[JsonIgnore]
			public readonly Map Map;
			public bool IsDM;
			public string TokenName;
			public readonly string JoinToken;
			public readonly string ConnectionId;
			
			/* Maps ConnectionTokens to ConnectionInfo objects */
			private static readonly Dictionary<string, ConnectionInfo> connections =
				new Dictionary<string, ConnectionInfo>();

			public static IEnumerable<ConnectionInfo> OfToken(string token, string map)
				=> connections.Values.Where(ci => ci.JoinToken == map && ci.TokenName == token);

			public static ConnectionInfo Add(HubCallerContext ct)
			{
				return connections[ct.ConnectionId] = new ConnectionInfo(ct.GetHttpContext().Request, ct.ConnectionId);
			}

			public static void Remove(HubCallerContext ct)
			{
				connections.Remove(ct.ConnectionId);
			}

			public static ConnectionInfo Get(HubCallerContext ct)
				=> connections[ct.ConnectionId];

			public static string GetDebugInfo(HubCallerContext ct)
				=> connections.Values.ToJson();

			private ConnectionInfo(HttpRequest req, string connectionId)
			{
				JoinToken = req.Query["token"];
				TokenName = req.Query["name"];
				ConnectionId = connectionId;

				if(string.IsNullOrEmpty(TokenName))
					TokenName = null;

				Map = State.MapJoinTokens[JoinToken];
				IsDM = true;
			}
		}

		private enum BlinkKind
		{
			Tile = 0,
			Token = 1,
			Initiative = 2,
		}
#region Fields
		private ConnectionInfo info;
#endregion

#region Properties
		private string GroupId
			=> Info.JoinToken;
			
		private ConnectionInfo Info
			=> info ?? (info = ConnectionInfo.Get(this.Context));
#endregion

#region Methods
		private Task fail(string msg, [CallerMemberName]string memberName = "")
			=> Clients.Caller.SendAsync("Fail", memberName, msg);

		public override async Task OnConnectedAsync()
		{
			try
			{
				ConnectionInfo.Add(this.Context);
				await Groups.AddToGroupAsync(this.Context.ConnectionId, GroupId);
			}
			catch
			{
				Context.Abort();
			}
		}

		#pragma warning disable 1998
		public override async Task OnDisconnectedAsync(Exception exception)
		{
			ConnectionInfo.Remove(this.Context);
		}
		#pragma warning restore

		public async Task AddToken(string tkJson)
		{
			Token token = tkJson.FromJson<Token>();

			if(token == null)
			{
				await fail("Invalid JSON");
				return;
			}

			token.Name = token.Name.Trim();

			if(string.IsNullOrEmpty(token.Name))
				await fail("Bad name");
			else if(Info.Map.Outside(token.Hitbox))
				await fail("Out of bounds");
			else if(Info.Map.TokensAt(token.Hitbox).Any())
				await fail("Token would collide");
			else
			{
				State.Invalidated = true;
				Info.Map.Tokens.Add(token);
				await Clients.Group(GroupId).SendAsync("AddToken", token.ToJson());
			}
		}

		public async Task AddEffect(string effectJson)
		{
			var e = effectJson.FromJson<Effect>();
			
			if(e is null)
				await fail("Invalid JSON");
			else if(e.Shape.IsEmpty)
				await fail("Empty shape");
			else
			{
				Info.Map.Effects.Add(e);
				State.Invalidated = true;
				await Clients.Group(GroupId).SendAsync("AddEffect", e.ToJson());
			}
		}

		/* Highlights a token or tile */
		public async Task Blink(int kind, int x, int y)
		{
			if(Info.Map.Outside(x,y,1,1))
				await fail("Out of bounds");
			else if(!Enum.IsDefined(typeof(BlinkKind), kind))
				await fail("Invalid blink kind");
			else if(kind >= (int)BlinkKind.Token && Info.Map.TokenAtExact(x, y) == null)
				await fail("Expecting token with blink kind");
			else
				await Clients.Group(GroupId).SendAsync("Blink", kind, x, y);
		}

		public async Task BlinkToken(int x, int y)
		{
			var tk = Info.Map.TokenAtExact(x, y);

			if(tk == null)
				await fail("No such token");
			else
				await Clients.Group(GroupId).SendAsync("BlinkToken", tk.X, tk.Y);
		}

		public async Task BlinkShape(string shapeJson)
		{
			var shape = shapeJson.FromJson<Shape>();

			if(shape is null)
				await fail("Invalid JSON");
			else if(!Enum.IsDefined(typeof(ShapeKind), shape.Kind))
				await fail("Invalid shape name");
			else if(shape.IsEmpty)
				await fail("Empty shape");
			else
				await Clients.Group(GroupId).SendAsync("BlinkShape", shape.ToJson());
		}

		public async Task Color(int x, int y, int color)
		{
			if(Info.Map.Outside(x,y,1,1))
				await fail("Out of bounds");
			else if(Info.Map.Colors[x,y] == color)
				await fail("No change");
			else
			{
				State.Invalidated = true;
				Info.Map.Colors[x,y] = color;
				await Clients.Group(GroupId).SendAsync("Color", x, y, color);
			}
		}

		#if DEBUG
		public async Task Debug()
		{
			await Clients.Caller.SendAsync("Debug", ConnectionInfo.GetDebugInfo(this.Context), Context.ConnectionId.ToJson());
		}
		#endif
		
		public async Task ModifyTokens(string shapeJson, string deltaJson)
		{
			var shape = shapeJson.FromJson<Shape>();
			var delta = deltaJson.FromJson<TokenDelta>();

			if(shape is null || delta is null)
			{
				await fail("Invalid JSON");
				return;
			}
			if(!Enum.IsDefined(typeof(ShapeKind), shape.Kind))
			{
				await fail("Invalid shape name");
				return;
			}
			if(delta.IsEmpty)
			{
				await fail("No difference");
				return;
			}
			if(shape.IsEmpty)
			{
				await fail("Empty shape");
				return;
			}

			string emsg = Info.Map.CanApply(shape, delta);

			if(emsg != null)
			{
				await fail(emsg);
				return;
			}

			Info.Map.Apply(shape, delta);
			State.Invalidated = true;
			await Clients.Group(GroupId).SendAsync("ModifyTokens", shape.ToJson(), delta.ToJson());
		}

		public async Task RemoveAll(string shapeJson)
		{
			var shape = shapeJson.FromJson<Shape>();

			if(shape is null)
				await fail("Invalid JSON");
			else if(!Enum.IsDefined(typeof(ShapeKind), shape.Kind))
				await fail("Invalid shape name");
			else if(shape.IsEmpty)
				await fail("Empty shape");
			else if(Info.Map.Tokens.RemoveAll(shape.Contains) > 0)
			{
				State.Invalidated = true;
				await Clients.Group(GroupId).SendAsync("RemoveAll", shape.ToJson());
			}
			else
				await fail("No tokens given");
		}

		public async Task RemoveEffect(string shapeJson)
		{
			var shape = shapeJson.FromJson<Shape>();

			if(shape is null)
				await fail("Invalid JSON");
			else if(!Enum.IsDefined(typeof(ShapeKind), shape.Kind))
				await fail("Invalid shape name");
			else if(shape.IsEmpty)
				await fail("Empty shape");
			else if(Info.Map.Effects.RemoveAll(e => e.Shape == shape) > 0)
			{
				State.Invalidated = true;
				await Clients.Group(GroupId).SendAsync("RemoveEffect", shape.ToJson());
			}
			else
				await fail("No such effect");
		}
		
		// Demands all data of the given fields
		public async Task Resync(int fieldIds)
		{
			var rep = Info.Map.FieldData((MapFields)fieldIds);

			if(rep.flags == 0)
				await fail("No fields requested");
			else
				await Clients.Caller.SendAsync("Resync", fieldIds, rep.json);
		}

		public async Task RtxUpdate(string data)
		{
			if(Info.Map.RtxInfo == data)
				await fail("No change");

			info.Map.RtxInfo = data;
			await Clients.Group(GroupId).SendAsync("RtxUpdate", data);
		}

		/* Sets the sqrt(2) approximation used by the map */
		public async Task Settings(string json)
		{
			MapSettings settings = json.FromJson<MapSettings>();
			
			if(settings == null)
				await fail("Invalid JSON");
			else if(Info.Map.Settings == settings)
				await fail("No change");
			else
			{
				State.Invalidated = true;
				Info.Map.Settings = settings;
				await Clients.Group(GroupId).SendAsync("Settings", settings.ToJson());
			}
		}

		public async Task SetSpawnZone(int sx, int sy, int ex, int ey)
		{
			if(sx == sy && sy == ex && ex == ey && ey == -1)
			{
				if(Info.Map.SpawnZone is null)
				{
					await fail("Map has no spawn zone to remove");
					return;
				}

				Info.Map.SpawnZone = null;
			}
			else
			{
				Shape s = Shape.From(ShapeKind.Mask, (sx, sy), (ex, ey));

				if(Info.Map.Outside(Math.Max(sx, ex), Math.Max(sy, ey)) ||
					Info.Map.Outside(Math.Min(sx, ex), Math.Min(sy, ey)))
				{
					await fail("Out of bounds");
					return;
				}

				Info.Map.SpawnZone = s;
			}

			State.Invalidated = true;
			await Clients.Group(GroupId).SendAsync("SetSpawnZone", sx, sy, ex, ey);
		}

		public async Task SetSize(int left, int right, int up, int down)
		{
			(int w, int h) newsize = Info.Map.Size.Add(left + right, up + down);

			if(newsize.w == 0 || newsize.h == 0)
			{
				await fail("Area would be 0");
				return;
			}

			int[,] newColors = new int[newsize.w, newsize.h].Fill2(0xFFFFFF);

			for (int x = 0; x < Info.Map.Width; x++)
			{
				int newx = x + left;
				
				if(newx < 0 || newx >= newsize.w)
					continue;

				for (int y = 0; newx >= 0 && y < Info.Map.Height; y++)
				{
					int newy = y + up;

					if(newy < 0 || newy >= newsize.h)
						continue;

					newColors[newx, newy] = Info.Map.Colors[x, y];
				}
			}

			Info.Map.Colors = newColors;
			Info.Map.Tokens.RemoveAll(tk => {
				tk.X += left;
				tk.Y += up;
				return Info.Map.Outside(tk.Hitbox);
			});
			
			State.Invalidated = true;
			await Clients.Group(GroupId).SendAsync("SetSize", left, right, up, down);
		}

		#pragma warning disable CS1998
		public async Task Save()
			=> Console.WriteLine($"Save requested. Wrote {State.Save().ToDataUnit()}.");

		#pragma warning restore CS1998
		#endregion
	}
}
