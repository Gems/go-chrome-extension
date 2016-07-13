(function($) {
	var branchRegex = /overriding environment variable 'BRANCH' with value '([^']+)'/;
	var masterBranchRegex = /setting environment variable 'BRANCH' to value '([^']+)'/;
	var retryCountUntilFail = 3;

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
	};

	var compareMap = {
		'4gametest.com': function(item) {
			return 'https://github.inn.ru/4game-web/com.4game/compare/' + item;
		},

		'4gamer-generator-featured': function(item) {
			return 'https://github.com/InnovaCo/4game-media/compare/' + item;
		},
	};

	function getBranchInfo(stageName, pipelineName, stageLocator) {
		var uri = '/go/files/' + stageLocator + '/' + stageName + '/cruise-output/console.log';

		return promisify($.ajax({url: uri}))
			.then(function(response) {
				var branch = branchRegex.exec(response);
				var masterBranch = masterBranchRegex.exec(response);

				return branch && branch[1] || masterBranch && masterBranch[1] || null;
			});
	}

	function getStageName(pipelineName, pipelineVersion) {
		var uri = '/go/pipelines/value_stream_map/' + pipelineName + '/' + pipelineVersion + '.json';

		return promisify($.ajax({url: uri, dataType: 'json'}))
			.then(function(response) {
				return response.levels
					.map(function(item) {
						return item.nodes[0];
					})
					.filter(function(item) {
						return item.name === pipelineName;
					})
					.reduce(function(item) {
						return item;
					})
					.instances[0]
					.stages[0]
					.locator;
			})
			.then(function(uri) {
				return promisify($.ajax({url: uri + '.json', dataType: 'json'}));
			})
			.then(function(response) {
				var failed = $(response.jobs_failed.html).find('a[href]').attr('href');
				var passed = $(response.jobs_passed.html).find('a[href]').attr('href');
				var progress = $(response.jobs_in_progress.html).find('a[href]').attr('href');
				var stageUri = failed || passed || progress;

				return stageUri && stageUri.split('/').pop();
			});
	}

	function promisify(deferred) {
		return new Promise(function(resolve, reject) {
			deferred.then(resolve, reject);
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
					var pipelineName = context.data.pipelineName;
					var pipelineVersion = context.data.count;

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

							if (storageItem) {
								label.html(storageItem);

								if (storageItem === 'master') {
									label.addClass('go-ext-labels--success');
								} else {
									label
										.attr({
											target: '_blank',
											href: compareMap[pipelineName] && compareMap[pipelineName](storageItem) || '#',
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

							if (!activeRequests[item.id] && storageItem == null && (!counts[item.id] || counts[item.id] && counts[item.id] < retryCountUntilFail)) {
								activeRequests[item.id] = getStageName(pipelineName, pipelineVersion)
									.then(function(stageName) {
										return getBranchInfo(stageName, pipelineName, itemData.stages[0].stageLocator);
									})
									.catch(function(error) {
										console.error(error);
										return null;
									})
									.then(function(branch) {
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
				window.dashboard_periodical_executer._loop_observers(
					JSON.parse(dashboard_periodical_executer.ongoingRequest.responseText),
					window.dashboard_periodical_executer.generateSequenceNumber()
				);
			}
		}
	});
})(window.jQuery);
