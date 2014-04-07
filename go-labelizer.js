var readyStateCheckInterval = setInterval(function() {
	if (!window.paginator)
		return;
	
	window.clearInterval(readyStateCheckInterval);
	
	var $ = jQuery, PaginatorSetParametersFromJson = window.paginator.setParametersFromJson;

	if (!PaginatorSetParametersFromJson) {
		return console.log("Can't find paginator method");
	}

	paginator.setParametersFromJson = function() {
		console.log('Everything has to be setted up');

		PaginatorSetParametersFromJson.apply(this, arguments);

		$('.pipeline-label').each(function() {
			var el = $(this), label = el.html();

			var stageHref = el.parent('tr').find('#stage-detail-' + label + '-Build .detail').attr('href');
			var consoleHref = stageHref.replace('pipelines') + 'Create_package/cruise-output/console.log';

			$.ajax(consoleHref, {
				success: function(data, st, xhr) {
					var branch = /overriding environment variable 'BRANCH' with value '([^']+)'/.exec(data);

					if (!branch) {
						return;
					}

					branch = branch[1];

					el.find('span').append($(branch));
				}
			});
		});
	};
}, 50);