using System;
using System.Diagnostics.CodeAnalysis;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace battlemap.Util
{
	abstract class JObjectConverter<T> : JsonConverter<T>
	{
		public override bool CanWrite
			=> false;

		protected abstract T Create(JObject jo);

		public override T ReadJson(JsonReader reader, Type objectType, [AllowNull] T existingValue, bool hasExistingValue, JsonSerializer serializer)
			=> Create(JObject.Load(reader));

		public override void WriteJson(JsonWriter writer, [AllowNull] T value, JsonSerializer serializer)
			=> throw new NotImplementedException();
	}
}