---
title: Directory Feed
categories:
  - spec
version: 0.2
status: stable
---

# Directory feed

Set `feed_url` to a content directory and enable `expandable_feed` to show dated posts on its landing page. An authored index can introduce the feed. Entries share Trendly's card layout and expand to show the Markdown body and cited media.

Search the published posts with `/` or the search box. Choose a tag to narrow the results, or change the date order. Feeds with multiple media types also offer a media filter. Copy the URL to share the current selection.

Set `rss.site_url` to the deployed site's absolute URL to publish the same selection at `rss.xml`. Trendly can subscribe to this URL. Both outputs omit paths listed under `drafts` in the repository configuration. Each published post keeps its own page URL.

See [Configuration](/configuration) for the publishing settings.
