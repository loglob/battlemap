using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using battlemap.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
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

		public async Task Add(string name, int x, int y, int w, int h)
		{
			name = name?.Trim();

			if(string.IsNullOrEmpty(name))
				await fail("Bad name");
			else if(Info.Map.Outside(x,y,w,h))
				await fail("Out of bounds");
			else if(Info.Map.TokensAt(x,y,w,h).Any())
				await fail("Token would collide");
			else
			{
				State.Invalidated = true;
				Info.Map.Tokens.Add(new Token(name, x, y, w, h));
				await Clients.Group(GroupId).SendAsync("Add", name, x, y, w, h);
			}
		}

		public async Task AddEffect(string kind, int sx, int sy, int ex, int ey, int color)
		{
			if(kind == null || !Enum.TryParse<ShapeKind>(kind, true, out ShapeKind k))
				await fail("Invalid shape name");
			else
			{
				var e = new Effect(k, (sx, sy), (ex, ey), color);
			
				if(e.Empty)
					await fail("Empty shape");
				else
				{
					Info.Map.Effects.Add(e);
					State.Invalidated = true;
					await Clients.Group(GroupId).SendAsync("AddEffect", kind, sx, sy, ex, ey, color);
				}
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

		public async Task BlinkShape(string kind, int sx, int sy, int ex, int ey)
		{
			if(kind == null || !Enum.TryParse<ShapeKind>(kind, true, out ShapeKind k))
				await Clients.Caller.SendAsync("Fail", "AddEffect", "Invalid kind");
			else if(new Shape(k, (sx, sy), (ex, ey)).Empty)
				await Clients.Caller.SendAsync("Fail", "AddEffect", "Empty shape");
			else
				await Clients.Group(GroupId).SendAsync("BlinkShape", kind, sx, sy, ex, ey);
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
		public async Task Move(int xFrom, int yFrom, int xTo, int yTo)
		{
			var t = Info.Map.TokenAt(xFrom, yFrom);

			if(t == null)
				await fail("No token given");
			else
			{
				/* translate coordinates for larger than (1,1) Tokens
					where (xFrom, yFrom) may no be equal to the token position*/
				(int x, int y) to = (xTo - (xFrom - t.X), yTo - (yFrom - t.Y));

				if(to.x == t.X && to.y == t.Y)
					await fail("No movement");
				else if(Info.Map.Outside(to, t.Size))
					await fail("Out of bounds");
				else if(Info.Map.TokensAt(to, t.Size).Any(tok => tok != t))
					await fail("Token would collide");
				else
				{
					State.Invalidated = true;
					await Clients.Group(GroupId).SendAsync("Move", t.X, t.Y, to.x, to.y);
					t.Position = to;
				}

			}
		}

		public async Task MoveAll(string kind, int sx, int sy, int ex, int ey, int offx, int offy)
		{
			(int x, int y) offset = (offx, offy);

			if(offset == (0,0))
			{
				await fail("No movement");
				return;
			}
			if(kind == null || !Enum.TryParse<ShapeKind>(kind, true, out ShapeKind k))
			{
				await fail("Invalid shape name");
				return;	
			}

			var shape = new Shape(k, (sx, sy), (ex, ey));

			if(shape.Empty)
			{
				await fail("Empty shape");
				return;		
			}

			var tokens = Info.Map.Tokens.Where(shape.Contains);

			if(!tokens.Any())
			{
				await fail("No tokens given");
				return;
			}

			foreach (var tk in tokens)
			{
				(int x, int y) to = tk.Position.Add(offset);

				if(Info.Map.Outside(to, tk.Size))
				{
					await fail("Out of bounds");
					return;
				}
				if(Info.Map.Tokens.Any(t => t.Hitbox.Intersects(to, tk.Size) && !shape.Contains(t)))
				{
					await fail("Tokens would collide");
					return;
				}
			}

			foreach (var tk in tokens)
			{
				tk.X += offx;
				tk.Y += offy;
			}
			
			State.Invalidated = true;
			await Clients.Group(GroupId).SendAsync("MoveAll", kind, sx, sy, ex, ey, offx, offy);
		}

		public async Task Remove(int x, int y)
		{
			var t = Info.Map.TokenAt(x,y);
			
			if(t != null)
			{
				State.Invalidated = true;
				Info.Map.Tokens.Remove(t);
				await Clients.Group(GroupId).SendAsync("Remove", t.X, t.Y);	
			}
			else
				await fail("No token given");
		}

		public async Task RemoveAll(string kind, int sx, int sy, int ex, int ey)
		{
			if(kind == null || !Enum.TryParse<ShapeKind>(kind, true, out ShapeKind k))
			{
				await fail("Invalid shape name");
				return;	
			}

			var shape = new Shape(k, (sx, sy), (ex, ey));

			if(shape.Empty)
			{
				await fail("Empty shape");
			}
			else if(Info.Map.Tokens.RemoveAll(shape.Contains) > 0)
			{
				State.Invalidated = true;
				await Clients.Group(GroupId).SendAsync("RemoveAll", kind, sx, sy, ex, ey);
			}
			else
				await fail("No tokens given");
		}

		public async Task RemoveEffect(string kind, int sx, int sy, int ex, int ey)
		{
			if(kind == null || !Enum.TryParse<ShapeKind>(kind, true, out ShapeKind k))
			{
				await fail("Invalid shape name");
				return;	
			}
			
			var shape = new Shape(k, (sx, sy), (ex, ey));

			if(shape.Empty)
				await fail("Empty shape");
			else if(Info.Map.Effects.RemoveAll(e => e.Shape == shape) > 0)
			{
				State.Invalidated = true;
				await Clients.Group(GroupId).SendAsync("RemoveEffect", kind, sx, sy, ex, ey);
			}
			else
				await fail("No such effect");
		}

		public async Task RemoveSprite(string img)
		{
			if(!Info.Map.Sprites.ContainsKey(img))
				await fail("No such image");
			else
			{
				State.Textures.Remove(Info.Map.Sprites[img]);
				Info.Map.Sprites.Remove(img);

				State.Invalidated = true;
				await Clients.Group(GroupId).SendAsync("RemoveSprite", img);
			}
		}
		
		public async Task SetHidden(int x, int y, bool hidden)
		{
			var tk = Info.Map.TokenAt(x, y);

			if(tk == null)
				await fail("No token given");
			else
			{
				tk.Hidden = hidden;
				State.Invalidated = true;
				await Clients.All.SendAsync("SetHidden", x, y, hidden);
			}
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


		/* Sets the sqrt(2) approximation used by the map */
		public async Task SetRoot2(int num, int den)
		{
			if(num < 1 || den < 1)
				await fail("Bad values");
			else if(num == Info.Map.Sqrt2Numerator && den == Info.Map.Sqrt2Denominator)
				await fail("No change");
			else
			{
				State.Invalidated = true;
				Info.Map.Sqrt2Denominator = den;
				Info.Map.Sqrt2Numerator = num;
				await Clients.Group(GroupId).SendAsync("SetRoot2", num, den);
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
				Shape s = new Shape(ShapeKind.Mask, (sx, sy), (ex, ey));

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
