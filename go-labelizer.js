var checkAndSetup = function() {
	if (!window.paginator) {
		setTimeout(checkAndSetup, 50);
		return false;
	}
	
	var $ = jQuery, PaginatorSetParametersFromJson = window.paginator.setParametersFromJson;

	if (!PaginatorSetParametersFromJson) {
		console.log("Can't find paginator method")
		return true;
	}

	window.paginator.setParametersFromJson = function() {
		console.log('Everything has to be setted up');

		$('.pipeline-label').each(function(idx) {
			var el = $(this), label = el.text();
			
			if (!label) 
				return;
			
			label = label.trim();
			try
			{
				var stageHref = el.parents('tr').find('#stage-detail-' + label + '-Build .detail').attr('href');
				var consoleHref = stageHref.replace('pipelines', 'files') + '/Create_package/cruise-output/console.log';
	
				$.ajax(consoleHref).done(function(data, st, xhr) {
					console.log("Here we are");
					var branch = /overriding environment variable 'BRANCH' with value '([^']+)'/.exec(data);

					if (!branch) {
						return;
					}

					branch = branch[1];

					el.find('span').append($(branch));
				});
			}
			catch(e)
			{
				console.log("go-labelizer error: " + e);
			}
		});

		return PaginatorSetParametersFromJson.apply(window.paginator, arguments);
	};
	
	return true;
};

checkAndSetup();