using System.Text.RegularExpressions;
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using battlemap.Models;
using Newtonsoft.Json;
using battlemap.Util;

namespace battlemap
{
	[AttributeUsage(AttributeTargets.Field, AllowMultiple = false)]
	public class PersistentAttribute : Attribute
	{}

	/* Handles state. Fields marked with [Persistent] are mirrored to disk. */
	public static class State
	{
		/* The directory persistent fields are stored in */
		private const string PersistentPath = "storage/";
		private static JsonSerializer serializer = new JsonSerializer
		{
			#if DEBUG
			Formatting = Formatting.Indented,
			#endif
		};

#region  Fields
		/* The currently valid Map join tokens */
		[Persistent]
		public static Dictionary<string, Map> MapJoinTokens = new Dictionary<string, Map>();

		/* The stored token sprites and ground textures */
		[Persistent]
		public static Dictionary<string, Image> Textures = new Dictionary<string, Image>();

#endregion

#region Properties
		public static int BackUpInterval { get; set; } = 300;
		public static bool Invalidated { get; set; } = false;

		private static string timestamp
			=> DateTime.Now.ToString("yyyy-MM-dd.HH:mm:ss");

		private static readonly Regex timestampMatcher = new Regex(@"[0-9]{4}(-[0-9]{2}){2}\.[0-9]{2}(:[0-9]{2}){2}");

		private static IEnumerable<FieldInfo> PersistentFields
			=> typeof(State).GetFields()
					.Where(f => f.GetCustomAttribute<PersistentAttribute>() != null);

		private static Task BackupTask { get; }
#endregion

		/* Loads Persistent fields from Disk */
		static State()
		{
			if(Directory.Exists(PersistentPath))
			{
				foreach (var field in PersistentFields)
				{
					var p = fieldPaths(field);

					if(File.Exists(p.regular))
					{
						if(!loadField(field, p.regular) && File.Exists(p.backup))
						{
							Console.WriteLine($"Trying to load .bak from {File.GetCreationTime(p.backup)}");
							loadField(field, p.backup);
						}
					}
				}
			}

			BackupTask = Task.Run(Backup);
		}

#region Methods
		private static bool loadField(FieldInfo field, string path)
		{
			try
			{
				using(var f = File.OpenRead(path))
				using(var z = new GZipStream(f, CompressionMode.Decompress))
				using(var r = new StreamReader(z))
					field.SetValue(null, serializer.Deserialize(r, field.FieldType));
				return true;
			}
			catch(Exception e)
			{
				Console.Error.WriteLine($"Failed to load state of {field.Name}");
				Console.Error.WriteLine(e);
				File.Move(path, $"{path}.fail.{timestamp}");
				return false;
			}
		}

		private static (string regular, string backup) fieldPaths(FieldInfo f)
			=> (PersistentPath + f.Name + ".gz", PersistentPath + f.Name + ".gz.bak");

		public static void Backup()
		{
			Thread.Sleep(BackUpInterval * 1000);

			do
			{
				if(Invalidated)
				{
					long w = Save();
					Console.WriteLine($"Saves maps. Wrote {w.ToDataUnit()}");
					Invalidated = false;
				}

				Thread.Sleep(BackUpInterval * 1000);
			} while(BackUpInterval > 0);
		}

		/* Saves persistent fields to disk. Returns the amount of bytes written. */
		public static long Save()
		{
			if(!Directory.Exists(PersistentPath))
				Directory.CreateDirectory(PersistentPath);

			long written = 0;

			foreach (var field in PersistentFields)
			{
				var p = fieldPaths(field);

				if(File.Exists(p.regular))
					File.Move(p.regular, p.backup, true);

				try
				{
					using(var file = File.Create(p.regular))
					using(var z = new System.IO.Compression.GZipStream(file, CompressionMode.Compress))
					using(var w = new StreamWriter(z))
					{
						serializer.Serialize(w, field.GetValue(null));
						w.Flush();
						written += file.Length;
					}
				}
				catch(Exception e)
				{
					Console.Error.WriteLine("Backup failed!");
					Console.Error.WriteLine(e);
					if(File.Exists(p.backup))
					{
						Console.WriteLine("Restoring bak");
						File.Copy(p.backup, p.regular, true);
					}
				}
			}

			return written;
		}
#endregion
	}
}