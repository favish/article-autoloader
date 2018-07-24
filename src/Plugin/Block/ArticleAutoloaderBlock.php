<?php
/**
 * @file
 * Contains \Drupal\article_autoloader\Plugin\Block\ArticleAutoloaderBlock.
 */

namespace Drupal\article_autoloader\Plugin\Block;
use Drupal\Core\Block\BlockBase;

/**
 * Provides a block that holds the article autoloader view.
 *
 * Does not actually load the views, they are loaded via ajax in /js/article-autoloader-load.js
 *
 * @Block(
 *   id = "article_autoloader_block",
 *   admin_label = @Translation("Article Autoloader Block"),
 *   category = @Translation("Blocks")
 * )
 */
class ArticleAutoloaderBlock extends BlockBase {

  /**
   * {@inheritdoc}
   */
  public function build() {
    return array(
      '#theme' => 'article_autoloader',
      '#attached' => array(
        'library' => array(
          'article_autoloader/article_autoloader',
        ),
      ),
    );
  }
}