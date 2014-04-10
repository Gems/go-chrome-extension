chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
		if (!/https:\/\/go\.inn\.ru\/go\/tab\/pipeline\/history\//.test(window.location.href)) {
			console.log('Inproper location')
			return clearInterval(readyStateCheckInterval);
		}

		if (document.readyState === "complete") {
			window.location.href="javascript:(function(){ s = document.createElement('script'); s.type='text/javascript'; s.src='https://rawgithub.com/Gems/go-chrome-extension/master/go-labelizer.js'; document.getElementsByTagName('head')[0].appendChild(s); }())";

			clearInterval(readyStateCheckInterval);
		}
	}, 50);
});
