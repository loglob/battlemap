/* cookies.js: Handles HTML cookies data and automatically stores data on tab close  */
// Currently unused

const cookie = {
	cookiename: `mapdata_${map.id}`,
	load: function()
	{
		for(let line of document.cookie.split(";"))
		{
			const kvp = line.split("=", 2);

			if(kvp.length != 2 || kvp[0].trim() != this.cookiename)
				continue;

			try
			{
				this.data = JSON.parse(decodeURIComponent(kvp[1]));
				return;
			}
			catch
			{
				console.error("Failed parsing cookie data:", kvp[1]);
			}
		}

		this.data = {};
	},
	store: function()
	{
		document.cookie = `${this.cookiename}=${encodeURIComponent(JSON.stringify(this.data))}; SameSite=strict; expires=${new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365).toUTCString()};`
	},
	data: {},
};

cookie.load()

window.addEventListener("beforeunload", function() {
	cookie.store();
	return null;
})