using System;
using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using battlemap.Models;
using System.IO;
using System.Text;
using System.Linq;
using System.Threading.Tasks;

namespace battlemap.Controllers
{
	public class MapController : Controller
    {
        public MapController(ILogger<MapController> logger)
        {}
	
        public async Task<IActionResult> Index(string token, bool dm, string name, bool sure)
		{
			ViewBag.LoadDmTools = dm;
			ViewBag.tokenName = name;

			if(token == null)
				return Redirect($"/map?token={State.MapJoinTokens.Insert(new Map()).token}&dm=true");
			else if(State.MapJoinTokens.ContainsKey(token))
			{
				var map = State.MapJoinTokens[token];

				if(!dm && !(map.SpawnZone is null))
				{
					if(string.IsNullOrEmpty(name))
						return View("AskName", token);

					var matches = map.Tokens.Where(t => t.Name.Similar(name)).ToArray();

					if(matches.Length > 0)
					{
						if(matches.Any(tk => tk.Name == name))
							// todo: player mode
							return View("Index", (token, State.MapJoinTokens[token]));
						else if(!sure)
							return View("DidYouMean", (token, matches, name));
					}
					
					// Add token
					if(!await map.Spawn(name, token))
						return View("MapFull");
					
				}

				return View("Index", (token, State.MapJoinTokens[token]));
			}
			else
				return View("BadMap");
		}

		public async Task<IActionResult> Beta(string token, bool dm, string name, bool sure)
		{
			return await Index(token, dm, name, sure);
		}

		public IActionResult Clone(string token)
		{
			if(token == null || !State.MapJoinTokens.ContainsKey(token))
				return View("badmap");
			else
				return Redirect($"/map?token={State.MapJoinTokens.Insert(new Map(State.MapJoinTokens[token])).token}&dm=true");
		}

		public IActionResult Watch(string token)
		{
			if(token == null || !State.MapJoinTokens.ContainsKey(token))
				return View("badmap");
			else
				return View((token, State.MapJoinTokens[token]));
		}

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
