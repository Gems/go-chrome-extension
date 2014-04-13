(function($) {
	var branchRegex = /overriding environment variable 'BRANCH' with value '([^']+)'/,
		retryCountUntilFail = 3;

	function getBranchInfo(stageLocator, callback) {
		$.get('/go/files/' + stageLocator + '/Create_package/cruise-output/console.log', function(data) {
			var branch = branchRegex.exec(data);

			if (typeof(callback) === 'function') {
				callback(branch ? branch[1] : null);
			}
		});
	}

	$(function() {
		var pipelineHistory = window.pipelineHistoryObserver,
			activeRequests = {},
			counts = {};

		if (pipelineHistory) {
			pipelineHistory._template.process = (function(process) {
				return function(context, flags) {
					var result = process.apply(this, arguments);

					if (this.name === 'pipeline-history-list-template') {
						var container = document.createElement('div');

						container.innerHTML = result;

						$('.pipeline-label[id]', container).each(function(i, item) {
							var $item = $(item),
								itemData = context.data.groups[0].history[i],
								label = $('<a>')
									.css({
										'display': 'inline-block',
										'margin': '2px 0',
										'padding': '.2em .6em .3em',
										'font-size': '11px',
										'font-weight': '700',
										'line-height': '1',
										'color': '#fff',
										'text-align': 'center',
										'white-space': 'nowrap',
										'vertical-align': 'baseline',
										'border-radius': '.25em',
										'-webkit-font-smoothing': 'antialiased',
										'-moz-osx-font-smoothing': 'grayscale'
									}),
								storageItem = localStorage.getItem(item.id);

							if (storageItem) {
								label.html(storageItem);

								if (storageItem === 'master') {
									label.css('background-color', '#5cb85c');
								} else {
									label
										.attr('target', '_blank')
										.attr('href', 'https://github.inn.ru/4game-web/com.4game/compare/' + storageItem)
										.css('background-color', '#428bca');
								}
							} else if (counts[item.id] && counts[item.id] >= retryCountUntilFail) {
								label
									.html('unknown branch')
									.css('background-color', '#d9534f');
							} else {
								label
									.html(counts[item.id] ? 'trying again' : 'loading info')
									.css('background-color', '#999');
							}

							if (!activeRequests[item.id] && storageItem == null) {
								activeRequests[item.id] = true;

								getBranchInfo(itemData.stages[0].stageLocator, function(branch) {
									if (branch != null) {
										localStorage.setItem(item.id, branch);
									} else {
										if (!counts[item.id]) {
											counts[item.id] = 0;
										}
										counts[item.id]++;
									}
									activeRequests[item.id] = false;
								});
							}

							$item
								.parent()
								.append('<div>', label);
						});
						result = container.innerHTML;
					}
					return result;
				}
			})(pipelineHistory._template.process);
		}
	});
})(window.jQuery);