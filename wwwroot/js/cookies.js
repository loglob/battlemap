/* cookies.js: Handles HTML cookies data and automatically stores data on tab close  */

const cookie = {
	/** Loads and parses a cookie object from the document's cookies
	 * @returns {void}
	*/
	load: function()
	{
		try
		{
			this.data = JSON.parse(localStorage[map.id]);

			if(typeof(this.data) !== "object")
				throw null
		}
		catch
		{
			this.data = {};
		}	
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

		localStorage[map.id] = JSON.stringify(this.data)
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