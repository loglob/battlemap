
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using battlemap.Models;
using Microsoft.AspNetCore.Mvc;

namespace battlemap.Controllers
{
	public class ImageController : Controller
    {
		private static readonly Dictionary<string, DateTime> modifyTimes = new Dictionary<string, DateTime>();
		private static readonly DateTime startTime = DateTime.Now;

		private static DateTime timestamp(string imgid)
			=> modifyTimes.ContainsKey(imgid) ? modifyTimes[imgid] : startTime;

		public async Task<IActionResult> Upload(string map, string token)
		{
			if(Request.Method != "POST")
				return StatusCode(404);
			if(map is null || token is null || Request.ContentType is null
				|| !Request.ContentType.StartsWith("image/")
				|| !State.MapJoinTokens.ContainsKey(map))
				return StatusCode(400);
			// Reject images > 1MiB
			if((Request.ContentLength.HasValue && Request.ContentLength.Value > 1024*1024))
				// Request Entity Too Large
				return StatusCode(413);

			token = Uri.UnescapeDataString(token);

			var type = Request.ContentType;
			var mem = new MemoryStream();
			await Request.Body.CopyToAsync(mem);

			if(mem.Length > 1024*1024)
				// Request Entity Too Large
				return StatusCode(413);

			var data = mem.ToArray();
			string imgtk = State.MapJoinTokens[map].SetTexture(token, new Image(type, data));
			
			modifyTimes[imgtk] = DateTime.Now;
			await Startup.MapHubContext.Clients.Group(map).SendCoreAsync("SetImage", new object[]{ token, imgtk });

			return Ok();
		}

		public async Task<IActionResult> Link(string map, string token, string url)
		{
			if(map is null || token is null || url is null)
				return StatusCode(400);

			string dec = Uri.UnescapeDataString(url);
			token = Uri.UnescapeDataString(token);

			// Ensure the given url looks valid and is not a data url.
			if(!Uri.IsWellFormedUriString(dec, UriKind.Absolute) || dec.StartsWith("data:")
				// Ensure map key is valid
				|| !State.MapJoinTokens.ContainsKey(map))
				return StatusCode(400);

			string imgtk = State.MapJoinTokens[map].SetTexture(token, new Image(dec));

			modifyTimes[imgtk] = DateTime.Now;
			await Startup.MapHubContext.Clients.Group(map).SendCoreAsync("SetImage", new object[]{ token, imgtk });

			return Ok();
		}

		public async Task<IActionResult> Remove(string map, string token)
		{
			if(map is null || token is null)
				return StatusCode(400);
			if(!State.MapJoinTokens.ContainsKey(map))
				return StatusCode(404);

			var m = State.MapJoinTokens[map];
			token = Uri.UnescapeDataString(token);

			if(!m.Sprites.ContainsKey(token))
				return StatusCode(404);
				

			string imgtk = m.Sprites[token];

			State.Textures.Remove(imgtk);
			m.Sprites.Remove(token);
			modifyTimes[imgtk] = DateTime.Now;
			await Startup.MapHubContext.Clients.Group(map).SendCoreAsync("SetImage", new object[]{ token, null });
			State.Invalidated = true;

			return Ok();
		}

		// Make the Image URLs cachable
		[HttpGet("image/get/{id}")]
		public async Task<IActionResult> Get(string id)
		{
			if(id is null || !State.Textures.ContainsKey(id))
				return StatusCode(404);
		
			var img = State.Textures[id];

			if(img.IsRedirect)
				return Redirect(img.Url);
			
			// TODO: look into caching problems with conditional responses
			DateTime ts = timestamp(id);
			
			// Handle conditional requests
			if(Request.Headers.ContainsKey("If-Modified-Since")
				&& Request.Headers["If-Modified-Since"]
					.All(s => DateTime.TryParse(s, out DateTime dt) && dt >= ts))
				return StatusCode(304);

			if(!Response.Headers.ContainsKey("last-modified"))
				Response.Headers["last-modified"] = ts.ToUniversalTime().ToHTTPDate();
			if(!Response.Headers.ContainsKey("cache-control"))
				Response.Headers["cache-control"] = "immutable";
			if(!Response.Headers.ContainsKey("Etag"))
				Response.Headers["Etag"] = $"\"{ts.Ticks.ToString("x")}\"";
			
			Response.StatusCode = 200;
			Response.ContentType = img.Type;
			await Response.BodyWriter.WriteAsync(img.Data);
			return new EmptyResult();
		}
	}
}