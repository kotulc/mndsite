---
title: Feed Selection
categories:
  - spec
version: 0.2
status: stable
---

# Feed selection

Set `feed.path` to the public Feed route and list Markdown files or directories under `feed.include`, relative to `content`. Directories include their descendants. Use `./` for the entire content tree or `[]` for an empty selection. An authored page at the Feed route can introduce the cards. Entries share Trendly's card layout and expand to show the Markdown body and cited media.

Search the published posts with `/` or the search box. Choose a tag to narrow the results, or change the date order. Feeds with multiple media types also offer a media filter. Copy the URL to share the current selection.

Set `rss.site_url` to the deployed site's absolute URL to publish the same selection at `rss.xml`. Both outputs use a valid date from the configured date field and omit paths listed under `drafts`. Page URLs and sidebar ordering come from the content tree and `nav_order`. Omit `feed.path` for an RSS-only selection.

Existing `feed_url` and `expandable_feed` settings continue to work when the `feed` block is absent. To migrate a card feed, use the old section as both the public path (for example, `/updates/`) and the included directory (`updates/`).

See [Configuration](/configuration) for the publishing settings.
