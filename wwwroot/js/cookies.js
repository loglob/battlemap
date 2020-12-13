/* cookies.js: Handles HTML cookies data and automatically stores data on tab close  */

const cookie = {
	/** The used cookie id
	 * @type {string}
	 * @constant
	*/
	cookiename: `mapdata_${map.id}`,
	/** Loads and parses a cookie object from the document's cookies
	 * @returns {void}
	*/
	load: function()
	{
		for(let line of document.cookie.split(";"))
		{
			const kvp = line.split("=", 2);

			if(kvp.length != 2 || kvp[0].trim() != this.cookiename)
				continue;

			try
			{
				this.data = JSON.parse(unescape(atob(kvp[1])));
				return;
			}
			catch
			{
				try
				{
					console.log("Falling back to URI component decoding")
					this.data = JSON.parse(decodeURIComponent(kvp[1]));
					return;
				}
				catch
				{
					console.error("Failed parsing cookie data:", kvp[1]);
				}
			}
		}

		this.data = {};
	},
	/** Stores the cookie object.
	 * Calls callbacks from onStoreCallbacks beforehand.
	 * @returns {void}
	*/
	store: function()
	{
		for (const cb of this.onStoreCallbacks) {
			try
			{
				cb();
			}
			catch(ex)
			{
				console.error("Error in cookie.store callback: ", ex);
			}
		}

		// date 1 year in the future
		const expires = new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 365);
		document.cookie = `${this.cookiename}=${btoa(escape(JSON.stringify(this.data)))}; SameSite=strict; expires=${expires.toUTCString()};`
	},
	/** Contains callbacks for finalizing cookie.data before it is stored.
	 * @type {function[]}
	 */
	onStoreCallbacks: [],
	/** Contains the parsed cookie data.
	 * @type {Object}
	 */
	data: {},
};

cookie.load()

window.addEventListener("beforeunload", function() {
	cookie.store();
	return null;
})