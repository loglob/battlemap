using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using battlemap.Util;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Newtonsoft.Json;

namespace battlemap
{
	public class Program
    {
		private static void unpack()
		{
			var dir = "unpacked/";
			var maps = dir + "maps/";
			int count = 0;

			Directory.CreateDirectory(dir);
			Directory.CreateDirectory(maps);
			var ser = new JsonSerializer
			{
				Formatting = Formatting.Indented,
			};

			foreach (var map in State.MapJoinTokens)
			{
				using(var f = File.CreateText(maps + map.Key))
				{
					ser.Serialize(f, map.Value);
				}

				Console.CursorLeft = 0;
				Console.Write($"Unpacked map {++count}/{State.MapJoinTokens.Count}");
			}

			var images = dir + "images/";
			Directory.CreateDirectory(images);
			count = 0;
			Console.WriteLine();

			foreach (var image in State.Textures)
			{
				if(image.Value.IsRedirect && Uri.IsWellFormedUriString(image.Value.Url, UriKind.Relative))
				{
					File.Copy("wwwroot/img/commoner.png", $"{images}{image.Key}.png");
				}
				else if(image.Value.IsRedirect)
				{
					HttpClient c = new HttpClient();
					var resp = c.GetAsync(image.Value.Url).GetAwaiter().GetResult();

					if(!resp.IsSuccessStatusCode)
					{
						Console.WriteLine($"\nFailed GET on '{image.Value.Url}'");
						goto skip;
					}

					using(var f = File.Create(images + image.Key + Path.GetExtension(image.Value.Url)))
					{
						resp.Content.CopyToAsync(f).GetAwaiter().GetResult();
					}
				}
				else
				{
					using(var f = File.Create(images + image.Key + "." + image.Value.Type.Substring("image/".Length)))
					{
						f.Write(image.Value.Data);
					}
				}

				skip:
				Console.CursorLeft = 0;
				Console.Write($"Unpacked image {++count}/{State.Textures.Count}");
			}

			Console.WriteLine();
		}

		private static void clean()
		{
			Textures.Initialize();

			// check for unused textures
			{
				int unused = 0;
				int cur = 0;

				foreach (var kvp in State.MapJoinTokens)
				{
					Console.CursorLeft = 0;
					Console.Write($"Checking map {++cur}/{State.MapJoinTokens.Count}");

					var tokenIdnames = kvp.Value.Tokens.Select(t => t.Name.Split('\n')[0]).ToHashSet();
					var orphaned = kvp.Value.Sprites.Keys.Where(k => !tokenIdnames.Contains(k)).ToList();

					foreach (var k in orphaned)
						Textures.Remove(kvp.Value, k);

					unused += orphaned.Count;
				}

				Console.WriteLine($"\nRemoved {unused} unused textures.");
			}

			// check for invalid links
			{
				var links = State.Textures
					.Where(t => t.Value.IsRedirect && Uri.IsWellFormedUriString(t.Value.Url, UriKind.Absolute))
					.ToList();
				int cur = 0;
				int rm = 0;

				foreach (var tex in links)
				{
					Console.CursorLeft = 0;
					Console.Write($"Checking Link {++cur}/{links.Count}");
					var response = new HttpClient().GetAsync(tex.Value.Url).GetAwaiter().GetResult();

					if(response.IsSuccessStatusCode)
						continue;

					rm++;

					foreach (var map in State.MapJoinTokens.Values)
					{
						foreach (var sprite in map.Sprites
							.Where(kvp => kvp.Value == tex.Key)
							.Select(kvp => kvp.Key)
							.ToList())
						{
							map.Sprites.AssertRemove(sprite);
						}
					}

					State.Textures.AssertRemove(tex.Key);
				}

				Console.WriteLine($"\nRemoved {rm} invalid texture links.");
			}

			Console.WriteLine($"Done. Wrote {State.Save().ToDataUnit()}.");
		}

		private static void list()
		{
			Console.WriteLine("Map	Tokens	Sprites	Size");

			foreach (var map in State.MapJoinTokens)
			{
				Console.WriteLine($"{map.Key}	{map.Value.Tokens.Count}	{map.Value.Sprites.Count}	{map.Value.Width}x{map.Value.Height}");
			}
		}

        public static void Main(string[] args)
        {
			if(args.Length > 0)
			{
				switch(args[0])
				{
					case "unpack":
						unpack();
					break;

					case "clean":
						clean();
					break;

					case "list":
						list();
					break;

					default:
						Console.WriteLine($"Unknown CLI option: '{args[0]}'");
					break;
				}

				return;
			}

			Textures.Initialize();
			CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }
}
