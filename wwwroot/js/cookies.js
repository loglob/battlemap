/* cookies.js: Declares the  Handles HTML cookies data */

function getCookies()
{
	try
	{
		let obj = {}
		
		for(let line of document.cookie.split(";"))
		{
			let kvp = line.split("=", 2);

			if(kvp.length != 2)
				continue;

			let key = decodeURIComponent(kvp[0]).trim()
			let val = decodeURIComponent(kvp[1])
			
			try
			{
				obj[key] = JSON.parse(val);
			}
			catch
			{
				obj[key] = val;
			}
		}

		return obj;
	}
	catch
	{
		console.error(`Failed parsing cookie "${dec}", deleting it`);
		document.cookie = ""
		return null;
	}
}

function setCookies(obj)
{
	for (const name in getCookies())
		document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; sameSite=strict';

	for (const key in obj)
		document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(obj[key]))}; sameSite=strict`
}

let cookies = getCookies();

window.addEventListener("beforeunload", function() {
	setCookies(cookies)
	return null;
})