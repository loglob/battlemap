using System;
using battlemap.Util;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace battlemap.Models.Shapes
{
	class ShapeConverter : JObjectConverter<Shape>
	{
		protected override Shape Create(JObject jo)
			=> Shape.From( Enum.Parse<ShapeKind>(jo["kind"].ToObject<string>(), true),
				jo["start"].ToObject<Vec2<int>>(),
				jo["end"].ToObject<Vec2<int>>());
	}
}