Article Autoloader is a Drupal 8 module that allows for a continuous article feed so that users as they finish reading
an article are show more to encourage them to stay engaged and on the site. It does so by defining a block with a view
in it. When added to a page, that block detects when it enters into the viewport via scrolling and will load more
articles.

To Use:

1. Install and enable the module.
2. Go to the block layout page.
3. Place the 'Article Autoloader Block' in a region of your choosing. It is recommend to place it at the
bottom (the last block) in content.
4. Enable any restrictions on the block (such as only display on "Articles").
5. When the block comes into the viewport, it will load 5 articles, by default. It shows the first one, but hides the
rest. As you scroll the rest will fade in. Once you reach the bottom of the 5th row, it will load 5 more via AJAX.

The block contains a view, which by default has some very simple configuration. It wil show content of type articles
in content mode with a display mode of full content. It shows 5 items at at time, with a pager and has AJAX enabled. To
customize, simply change the configuration of the view.

The way it's currently designed, the module does not pass any contextual filters to the view, to allow the view to be
cached heavily. It does however create a local storage item that tracks read nodes, with their NID and a timestamp.
Once the view is loaded, but before it is loaded, the module will filter over the rows and remove any row that contains
a node that has already been read. If it removes all of the result set, it will re-call the view.