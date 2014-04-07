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
	
	$('head').append('<style type="text/css"> .pipeline-label-branch { vertical-align: middle; font-weight: normal; display: inline-block; margin: -5px 0 0 5px; } .pipeline-master { font-weight: bold; } </style>');

	var labelize = function() {
		$('.pipeline-label').each(function(idx) {
			var el = $(this), label = el.text();
			
			if (!label) 
				return;
			
			label = label.trim();
			
			try
			{
				var stageHref = el.parents('tr').find('#stage-detail-' + label + '-Build .detail').attr('href');
				var consoleHref = stageHref.replace('pipelines', 'files') + '/Create_package/cruise-output/console.log';
	
				$.ajax({ url: consoleHref }).done(function(data, st, xhr) {
					var branch = /overriding environment variable 'BRANCH' with value '([^']+)'/.exec(data);

					if (!branch) {
						return;
					}

					branch = branch[1];
					
					el.append('<span class="pipeline-label-branch pipeline-' + branch + '" title="' + branch + '">' + (branch === 'master' ? 'master' : 'feature') + '</span>');
				});
			}
			catch(e)
			{
				console.error(e);
			}
		});		
	};

	window.paginator.setParametersFromJson = function() {
		labelize();

		return PaginatorSetParametersFromJson.apply(window.paginator, arguments);
	};
	
	labelize();
	
	return true;
};

checkAndSetup();