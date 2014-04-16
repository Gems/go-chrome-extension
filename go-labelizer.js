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

	function appendStyles() {
		var link = document.createElement('link');

		// Проставляем атрибуты.
		link.type = 'text/css';
		link.rel = 'stylesheet';
		link.href = 'https://rawgit.com/Gems/go-chrome-extension/master/go-labelizer.css';

		// И вставляем в HEAD стили.
		$('head').append(link);
	}

	$(function() {
		var pipelineHistory = window.pipelineHistoryObserver,
			activeRequests = {},
			counts = {};

		// Чтоб не переделывать inject.js и не пересобирать хромовский экстеншн вставляем в DOM 
		// кастомные стили в этом скрипте.
		appendStyles();

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
								label = $('<a>').addClass('go-ext-labels'),
								storageItem = localStorage.getItem(item.id),
								isCorrectPipeline = itemData.stages[0].stageLocator.indexOf('4gametest.com') >= 0;

							if (!isCorrectPipeline) {
								return;
							}

							if (storageItem) {
								label.html(storageItem);

								if (storageItem === 'master') {
									label.addClass('go-ext-labels--success');
								} else {
									label
										.attr({
											target: '_blank',
											href: 'https://github.inn.ru/4game-web/com.4game/compare/' + storageItem
										})
										.addClass('go-ext-labels--info');
								}
							} else if (counts[item.id] && counts[item.id] >= retryCountUntilFail) {
								label
									.html('unknown branch')
									.addClass('go-ext-labels--error');
							} else {
								label.html(counts[item.id] ? 'trying again' : 'loading info');
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

			// Сразу же тригерим отрисовку с последними данными что хранятся в кеше.
			if (window.dashboard_periodical_executer) {
				window.dashboard_periodical_executer._loop_observers({
					responseText: window.dashboard_periodical_executer._json_text_cache
				}, window.dashboard_periodical_executer.generateSequenceNumber());
			}
		}
	});
})(window.jQuery);