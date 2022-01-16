
using System;
using System.Collections.Generic;
using System.Linq;
using battlemap.Models;
using battlemap.Util;

namespace battlemap
{
	/* Handles access and reference counting for State.Textures */
	public class Textures
	{
		/* Maps images to their tokens */
		private static Dictionary<Image, string> reverse = new Dictionary<Image, string>();

		static Textures()
		{
			Dictionary<string,string> duplicates = new Dictionary<string, string>();

			foreach (var img in State.Textures)
			{
				if(reverse.TryGetValue(img.Value, out string dup))
					duplicates[img.Key] = dup;
				else
					reverse[img.Value] = img.Key;
			}

			if(duplicates.Count > 0)
				Console.WriteLine($"[Textures]	Found and removed {duplicates.Count} duplicate images.");

			foreach (var dup in duplicates)
				State.Textures.Remove(dup.Key);

			foreach (var map in State.MapJoinTokens.Values)
			{
				foreach (var sprite in map.Sprites.ToList())
				{
					if(duplicates.TryGetValue(sprite.Value, out string rep))
					{
						map.Sprites[sprite.Key] = rep;
						State.Textures[rep].ReferenceCount++;
					}
					else
						State.Textures[sprite.Value].ReferenceCount++;
				}
			}

			var orphaned = State.Textures.Where(kvp => kvp.Value.ReferenceCount <= 0).ToList();

			foreach (var orphan in orphaned)
			{
				reverse.Remove(orphan.Value);
				State.Textures.Remove(orphan.Key);
			}

			if(orphaned.Count > 0)
				Console.WriteLine($"[Textures]	Found and removed {orphaned.Count} orphaned textures.");

			if(duplicates.Count > 0 || orphaned.Count > 0)
				State.Invalidated = true;

			// Sanity check
			/*foreach (var kvp in reverse)
			{
				if(!State.Textures.TryGetValue(kvp.Value, out Image other))
					Console.WriteLine("reverse key not present!");
				else if(other != kvp.Key)
					Console.WriteLine("Wrong key in reverse!");
			}*/

		}

		/* Ensures the static constructor has been invoked */
		public static void Initialize()
		{	}

		public static (string token, Image image) Insert(Image img)
		{
			// Check if the image already exists
			if(reverse.TryGetValue(img, out string dup))
				return (dup, State.Textures[dup]);
			else
			{
				var ins = State.Textures.Insert(img, Image.TokenLength);

				reverse.Add(ins.value, ins.token);
				State.Invalidated = true;

				return ins;
			}
		}

		public static (string token, Image image) Set(Map map, string sprite, Image img)
		{
			var i = Insert(img);

			if(map.Sprites.TryGetValue(sprite, out string oldToken))
			{
				if(oldToken == i.token)
					return i;

				State.Textures[oldToken].ReferenceCount--;
			}

			map.Sprites[sprite] = i.token;
			i.image.ReferenceCount++;
			State.Invalidated = true;

			return i;
		}

		public static void Remove(Map map, string sprite)
		{
			if(map.Sprites.TryGetValue(sprite, out string oldImage))
			{
				State.Textures[oldImage].ReferenceCount--;
				map.Sprites.Remove(sprite);
				State.Invalidated = true;
			}
		}

		public static void Delete(Image img)
		{
			State.Textures.Remove(reverse[img]);
			reverse.Remove(img);
			State.Invalidated = true;
		}
	}
}