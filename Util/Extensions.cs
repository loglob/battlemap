using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Xml.Linq;
using Microsoft.AspNetCore.Html;
using Newtonsoft.Json;

namespace battlemap.Util
{
	public static class Extensions
    {
		/* Enumerates all items in the 2D array with first index i */
		private static IEnumerable<T> unwrap<T>(this T[,] arr, int i)
		{
			for (int j = 0; j < arr.GetLength(1); j++)
				yield return arr[i, j];
		}

		/* Turns a 2D array to a 2D IEnumerable.
			It is indexed as {{arr[0,0], arr[0,1], ...}, {arr[1,0], arr[1,1], ...}} */
		public static IEnumerable<IEnumerable<T>> Unwrap<T>(this T[,] arr)
		{
			for (int i = 0; i < arr.GetLength(0); i++)
				yield return unwrap(arr, i);
		}

		/* Casts an object to an HtmlString */
		public static HtmlString AsHtml(this object o)
			=> new HtmlString(o.ToString());

		/* Fills a 2D array */
		public static T[,] Fill2<T>(this T[,] arr, T val)
		{
			for (int i = 0; i < arr.GetLength(0); i++)
			{
				for (int j = 0; j < arr.GetLength(1); j++)
					arr[i,j] = val;
			}

			return arr;
		}

		/* Turns an Enumerable into an Enumerable of array with the given length.
			The last item may less than len elements, instead containing leftover elements from ls.  */
		public static IEnumerable<T[]> Granulate<T>(this IEnumerable<T> ls, int len)
		{
			if(len <= 0)
				throw new IndexOutOfRangeException();

			T[] arr = new T[len];
			int cur = 0;

			foreach (T i in ls)
			{
				arr[cur++] = i;

				if(cur == len)
				{
					T[] cp = new T[len];
					Array.Copy(arr, cp, len);
					yield return cp;
					cur = 0;
				}
			}

			if(cur > 0)
			{
				T[] cp = new T[cur];
				Array.Copy(arr, cp, cur);
				yield return cp;
			}
		}

		public static string ToJson(this object data)
		{
			using(var writer = new StringWriter())
			{
				new JsonSerializer().Serialize(writer, data);
				writer.Flush();

				return writer.ToString();
			}
		}

		public static T FromJson<T>(this string json)
		{
			using(var reader = new StringReader(json))
			using(var jsonReader = new JsonTextReader(reader))
			{
				try
				{
					return new JsonSerializer().Deserialize<T>(jsonReader);
				}
				catch(Exception)
				{
					return default(T);
				}
			}
		}

		/* Finds a string composed of alphanumeric characters of the given length (default 8)
			that isn't already a key in the dictionary */
		public static string NewToken<T>(this Dictionary<string, T> tokenDict, int len = 8)
		{
			retry:
			char[] chr = new char[len];
			Random rng = new Random();

			for (int i = 0; i < len; i++)
			{
				int cur = rng.Next(26+26+10);

				if(cur >= 36)
					chr[i] = (char)(cur - 36 + (int)'A');
				else if(cur >= 10)
					chr[i] = (char)(cur - 10 + (int)'a');
				else
					chr[i] = (char)(cur + (int)'0');
			}

			string token = new string(chr);

			if(tokenDict.ContainsKey(token))
				goto retry;

			return token;
		}

		/* Finds a string composed of alphanumeric characters of the given length (default 8)
			that isn't already a key in the dictionary and inserts the given value at that point. */
		public static (string token, T value) Insert<T>(this Dictionary<string, T> dict, T value, int len = 8)
		{
			string token = dict.NewToken(len);
			return (token, dict[token] = value);
		}

		public static bool Similar(this string l, string r)
			=> l.ToLower() == r.ToLower();

		public static string ToDataUnit(this long l)
		{
			string[] dataUnits = {
				"B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"
			};
			int i;

			for (i = 0; l >= 1024; i++)
				l /= 1024;

			return $"{l} {dataUnits[i]}";
		}

		public static string ToHTTPDate(this DateTime dt)
			=> dt.ToString("ddd, dd MMM yyyy HH:mm:ss") + " GMT";

		public static double RoundAwayFrom(this double x, double other)
			=> (x < other) ? Math.Floor(x) : Math.Ceiling(x);

		public static (T b, T a) Swap<T>(this (T a, T b) t)
			=> (t.b, t.a);

		public static void AssertRemove<TKey, TVal>(this Dictionary<TKey, TVal> dict, TKey key)
		{
			if(!dict.Remove(key))
				throw new KeyNotFoundException($"The key '{key}' is not present in the dictionary");
		}
	}
}