(function($, Drupal) {
  Drupal.behaviors.article_autoloader = {
    attach: function (context) {
      const nodeLimit = 200;
      const autoloadDrupalSettings = drupalSettings.autoloader;
      const drupal = window.Drupal;

      // Iterate over view and remove the view for any article already read (present in the local storage item).
      function removeAlreadyReadNodes(nodeList) {
        let viewRow = $('.view-article-autoloader .view-content:not(.filtered) .views-row');
        let removedArticleCount = 0;

        if(viewRow.length > 1) {
          nodeList.forEach(function (element) {
            if(!$(element).parent('.view-content').hasClass('filtered')) {
              viewRow.parent().find('.views-row[data-nid="' + element.data + '"]').remove();
              removedArticleCount++;
            }
          });
        }
        else if(viewRow.length === 1) {
          viewRow.find('.views-row[data-nid="' + viewRow + '"]').remove();
        }

        if($('.view-article-autoloader .view-content:not(.filtered)').children().length === 0) {
          callView();
        }

        $('.view-article-autoloader .view-content').addClass('filtered');
        autoloadDrupalSettings.filtered_articles += removedArticleCount;
      }

      function getLocaleStorageNodeList() {
        return JSON.parse(localStorage.getItem('read_node_list'));
      }

      function saveDataToLocalStorage(data) {
        let readNodes = JSON.parse(localStorage.getItem('read_node_list'));
        let duplicate = false;

        readNodes.some(function(element) {
          if (element.data === data) {
            duplicate = true;
          }
        });

        if(!duplicate) {
          let dataWithTimestamp = { data: data, timestamp: Date.now() };
          readNodes = add(readNodes, dataWithTimestamp);
          localStorage.setItem('read_node_list', JSON.stringify(readNodes));
        }
      }

      function initializeLocalStorage(data) {
        let readNodes = [];
        let dataWithTimestamp = { data: data, timestamp: Date.now() };
        readNodes = add(readNodes, dataWithTimestamp);
        localStorage.setItem('read_node_list', JSON.stringify(readNodes));
      }

      // Add to the array, ensuring it does not exceed a pre-defined limit in size.
      function add(readNodes, data) {
        readNodes.unshift(data);
        readNodes = readNodes.slice(0, nodeLimit);

        return readNodes;
      }

      // Get the first row in the view that is not hidden/displayed and show/display it. The first view row is has visibility hidden but is displayed. The rest are not displayed.
      function showNextViewRow() {
        let hiddenViewRows = $('.autoloaded-views-row:not(.visible)');

        autoloadDrupalSettings.current_nid_in_view = hiddenViewRows.first().attr('data-alias');
        hiddenViewRows.first().addClass('visible').removeClass('autoloaded-view--hidden');
      }

      function alterUrlAndTitle(title, url) {
        window.history.replaceState({pageTitle: title}, title, url);
        document.title = title;
      }

      function removePager() {
        $('.view-article-autoloader .pager').remove();
      }

      function addLoadingAnimation(target) {
        target.append('<div class="autoloader--loading-element">Loading More Articles</div>');
      }

      function callStatistics(nid) {
        $.ajax({
          type: 'POST',
          cache: false,
          url: drupalSettings.statistics.url,
          data: { 'nid': nid }
        });
      }

      function removeLoadingAnimation() {
        $('.autoloader--loading-element').remove();
      }

      function callView() {
        let $viewContainer = $('.autoload-view-container', context);
        let nodeList = getLocaleStorageNodeList();
        let currentViewPage = autoloadDrupalSettings.current_page;

        addLoadingAnimation($viewContainer);

        $.ajax({
          url: drupalSettings.path.baseUrl + "views/ajax?_wrapper_format=drupal_ajax",
          type: 'post',
          data: {
            view_name: 'article_autoloader',
            view_display_id: 'default',
            view_dom_id: 'autoloader',
            page: currentViewPage
          }
        })
        .done(function (data) {
          removeLoadingAnimation();

          let command = data.find(function (element) {
            return element['command'] === 'insert' && element['method'] === 'replaceWith'
          });
          $viewContainer.append(command['data']);

          removeAlreadyReadNodes(nodeList);
          showNextViewRow();
          processView();
          createLastRowWatcher();
          removePager();
          autoloadDrupalSettings.current_page += 1;
          drupal.attachBehaviors($('#block-articleautoloaderblock')[0]);
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          console.warn('AJAX failed', textStatus, errorThrown);
        });
      }

      // Iterates over our view rows, checking to see if they have been processed already and creates watchers for scrollMonitor.
      function processView() {
        let rows = $('.autoloaded-views-row');

        rows.each(function (index, value) {
          let $row = $(value);

          if ($row.hasClass('autoloaded--processed')) {
            return;
          }

          markElementProcessed($row);

          let articleTitle = $(value).attr('data-title');
          let articleUrl = $(value).attr('data-alias');
          let nid = $(value).attr('data-nid');
          let elementWatcher = scrollMonitor.create($(value));
          let loadMarkerWatcher = scrollMonitor.create($(value).find('.autoloaded-load-marker'));

          elementWatcher.fullyEnterViewport(function () {
            if(elementWatcher.isInViewport) {
              alterUrlAndTitle(articleTitle, articleUrl);
              saveDataToLocalStorage(nid);
            }
          });

          loadMarkerWatcher.fullyEnterViewport(function() {
            if(elementWatcher.isInViewport) {
              showNextViewRow();
              callStatistics(nid);
              loadMarkerWatcher.destroy();
            }
          });
        });
      }

      function markElementProcessed(element) {
        element.addClass('processed');
      }

      // Create a watcher element specifically for the trigger element in the last view row. This way we can re-call the AJAX view with a new page.
      function createLastRowWatcher() {
        let element = $('.autoloaded-row--last .autoloaded-load-marker');
        let lastViewRowWatcher = scrollMonitor.create(element);

        lastViewRowWatcher.enterViewport(function() {
          if(element.parent().hasClass('visible')) {
            element.remove();
            callView();
            markElementProcessed(element);
            lastViewRowWatcher.destroy();
          }
        });
      }

      // Only run this once. Context is document the first time the page loads.
      if (context === document) {
        let nid = autoloadDrupalSettings.nid;
        let originalUrl = autoloadDrupalSettings.original_url;
        let originalTitle = autoloadDrupalSettings.original_title;

        if (localStorage.getItem('read_node_list') === null) {
          initializeLocalStorage(nid);
        }
        else {
          saveDataToLocalStorage(nid);
        }

        let originalArticleWatcher = scrollMonitor.create($('.block-system-main-block article'));
        let hasArticleLeftViewport = false;

        originalArticleWatcher.exitViewport(function () {
          hasArticleLeftViewport = true;
        });

        originalArticleWatcher.fullyEnterViewport(function () {
          if (hasArticleLeftViewport) {
            alterUrlAndTitle(originalTitle, originalUrl);
            hasArticleLeftViewport = false;
          }
        });

        let autoloaderBlockWatcher = scrollMonitor.create($('#block-articleautoloaderblock', context));

        // Load the view the first time when the user scrolls down. We don't want to load the view unless they actually make it to the bottom of the article.
        // The first time we load the first page. If the user reaches the bottom of the last article, we call the view again but with the next page.
        autoloaderBlockWatcher.enterViewport(function() {
          callView();
          autoloaderBlockWatcher.destroy();
        });
      }
    }
  }
})(jQuery, Drupal);
