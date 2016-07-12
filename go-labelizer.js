(function($) {
	var branchRegex = /overriding environment variable 'BRANCH' with value '([^']+)'/;
	var retryCountUntilFail = 3;

	var map = {
		'api2.4gametest.com': 'Build',
		'm.4gametest.com': 'Create-Package',
		'api.4gametest.com': 'Create-Package',
		'4gamer-generator-featured': 'Create-Package',
	};

	var linksMap = {
		'4gametest.com': function(item) {
			if (item == 'master') {
				return 'https://ru.4gametest.com/';
			} else {
				return 'https://' + item.replace(/^feature-/, '') + '-ru.4gametest.com/';
			}
		},

		'4gamer-generator-featured': function(item) {
			if (item == 'master') {
				return 'https://ru.4gametest.com/4gamer/';
			} else {
				return 'https://ru.4gametest.com/4gamer-' + item.replace(/^feature-/, '') + '/';
			}
		},
	}

	function getBranchInfo(pipelineName, stageLocator, callback) {
		var stageName = map[pipelineName] || 'Create_package';

		return $.ajax({
			url: '/go/files/' + stageLocator + '/' + stageName + '/cruise-output/console.log',
			complete: function(jqXHR, textStatus) {
				var branch;

				if (typeof(jqXHR.responseText) === 'string') {
					branch = branchRegex.exec(jqXHR.responseText);
				}

				if (typeof(callback) === 'function') {
					callback(branch ? branch[1] : null);
				}
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
							var $item = $(item);
							var $parent = $item.parent();
							var $container = $('<div>').addClass('go-ext-container');
							var itemData = context.data.groups[0].history[i];
							var label = $('<a>').addClass('go-ext-labels');
							var storageItem = localStorage.getItem(item.id);
							var pipelineName = context.data.pipelineName;

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

							if (activeRequests[item.id]) {
								activeRequests[item.id].abort();
							}

							if (storageItem == null && (!counts[item.id] || counts[item.id] && counts[item.id] < retryCountUntilFail)) {
								activeRequests[item.id] = getBranchInfo(pipelineName, itemData.stages[0].stageLocator, function(branch) {
									if (branch != null) {
										localStorage.setItem(item.id, branch);
									} else {
										if (!counts[item.id]) {
											counts[item.id] = 0;
										}
										counts[item.id]++;
									}
									delete activeRequests[item.id];
								});
							}

							$parent.append($container);
							$container.append(label);

							if (storageItem != null && itemData.stages[1].stageStatus.toLowerCase() == 'passed') {
								var qaUrl = linksMap[pipelineName] && linksMap[pipelineName](storageItem);

								if (qaUrl) {
									$('<a>')
										.addClass('go-ext-labels go-ext-labels--link')
										.html('go to: ' + qaUrl)
										.attr({
											target: '_blank',
											href: qaUrl
										})
										.appendTo($container);
								}
							}
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
