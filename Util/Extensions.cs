
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
		/* Turns an IEnumerable into an HTML list, including a footer */
		public static XElement Listify<T>(this IEnumerable<T> ls, XElement footer, bool ordered = false)
			=> new XElement(ordered ? "ol" : "ul", ls.Select(i => new XElement("li", ls)).Append(footer));
		
		/* Turns a 2D IEnumerable into a HTML table, with an optional header row */
		public static XElement Tabularize<T>(this IEnumerable<IEnumerable<T>> t, IEnumerable<T> header = null)
		{
			var rows = t.Select(tr => new XElement("tr",
					tr.Select(td => new XElement("td", td))));

			if(header != null)
				rows = rows.Prepend(new XElement("tr", header.Select(th => new XElement("th", th))));

			return new XElement("table", rows);
		}

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

		public static string DecodeBase64(this string encoded)
			=> System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(encoded));

		/* Applies a selector to all elements in a 2D IEnumerable */
		public static IEnumerable<IEnumerable<T2>> Select2<T1,T2>(this IEnumerable<IEnumerable<T1>> lls, Func<T1,T2> f)
			=> lls.Select(ls => ls.Select(f));

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
			The last item may not have len elements, instead containing leftover elements from ls.  */
		public static IEnumerable<T[]> Granulize<T>(this IEnumerable<T> ls, int len)
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

		public static IEnumerable<(int index, T value)> WithIndex<T>(this IEnumerable<T> ls)
		{
			int i = 0;

			foreach (var item in ls)
				yield return (i++, item);
		}

		public static async Task ProcessAllAsync<T>(this IEnumerable<T> data, Action<T> proc)
			=>	await Task.WhenAll(data.Select(d => {
					var t = new Task((object o) => proc((T)o) , d);
					t.Start();
					return t;
				}));
		
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
			using(var jreader = new JsonTextReader(reader))
			{
				try
				{
					return new JsonSerializer().Deserialize<T>(jreader);
				}
				catch(Exception)
				{
					return default(T);
				}
			}		
		}

		public static T FromJsonAnonymous<T>(this string json, T definition)
		{
			try
			{
				return JsonConvert.DeserializeAnonymousType<T>(json, definition);
			}
			catch(Exception)
			{
				return default(T);
			}
				
		}

		public static void ProcessAll<T>(this IEnumerable<T> data, Action<T> proc)
		{
			var t = (data.Select(d => {
					var t = new Task((object o) => proc((T)o), d);
					t.Start();
					return t;
			}).ToArray());

			Task.WaitAll(t);
			return;
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

		/* Finds a string composed of alphanumeric characters of the fiven length (default 8)
			that isn't already a key in the dictionary and inserts the given value at that point. */
		public static (string token, T value) Insert<T>(this Dictionary<string, T> dict, T value, int len = 8)
		{
			string token = dict.NewToken(len);
			return (token, dict[token] = value);
		}

		public static Dictionary<Tkey, Tnewval> SelectValue<Tkey, Tval, Tnewval>(this Dictionary<Tkey, Tval> dict,
			Func<Tval, Tnewval> f)
			=> new Dictionary<Tkey, Tnewval>(dict.Select(kvp
				=> new KeyValuePair<Tkey, Tnewval>(kvp.Key, f(kvp.Value))));

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

		public static bool TryGet<T>(this T? opt, out T value) where T : struct
		{
			if(opt.HasValue)
			{
				value = opt.Value;
				return true;
			}
			else
			{
				value = default(T);
				return false;
			}
		}

		public static void ForEach<T>(this IEnumerable<T> ls, Action<T> f)
		{
			foreach (var i in ls)
				f(i);
		}

		public static Dictionary<Tkey, Tval> ToDictionary<Tkey, Tval>(this IEnumerable<(Tkey key, Tval val)> ls)
			=> new Dictionary<Tkey, Tval>(ls.Select(t => new KeyValuePair<Tkey, Tval>(t.key, t.val)));
		
		public static double RoundAwayFrom(this double x, double other)
			=> (x < other) ? Math.Floor(x) : Math.Ceiling(x);
	}
}