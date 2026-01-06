import { PageLayout } from "../cfg"
import * as Component from "../components"
import { D3Config } from "../components/Graph"

/**
 * Common graph configuration options shared across multiple page types.
 * These can be overridden in individual layouts as needed.
 */
export const defaultGraphOptions: Partial<D3Config> = {
  scale: 0.5,
  linkStrength: {
    tagTag: 0.5,
    tagPost: 0.25,
    postPost: 0.05,
  },
  edgeOpacity: {
    tagTag: { min: 0.9, max: 0.9 },
    tagPost: { min: 0.2, max: 0.9 },
    postPost: { min: 0.05, max: 0.9 },
  },
  repelForce: 2,
  centerForce: 0.25,
  linkDistance: {
    tagTag: 50,
    tagPost: 75,
    postPost: 100,
  },
  baseSize: {
    tags: 16,
    posts: 10,
  },
  tagColorGradient: [
    "#FF0000",
    "#FF7F00",
    "#FFFF00",
    "#00FF00",
    "#0000FF",
    "#B301FF",
    "#FF0000",
  ],
  labelAnchor: {
    baseY: 1.2,
    scaleFactor: 0.05,
  },
}

/**
 * Local graph options optimized for content pages.
 * Shows immediate connections with tighter spacing.
 */
export const defaultLocalGraphOptions: Partial<D3Config> = {
  ...defaultGraphOptions,
  depth: 1,
  scale: 0.7,
  baseSize: {
    tags: 10,
    posts: 10,
  },
  linkDistance: {
    tagTag: 50,
    tagPost: 50,
    postPost: 50,
  },
}

/**
 * Layout configuration for the site index/homepage.
 * Can be customized to provide a unique landing page experience.
 * 
 * Customization options:
 * - Adjust FullGraph height by changing the "height" property (e.g., "600px", "50vh")
 * - Modify graph behavior by overriding defaultGraphOptions properties
 */
export const indexLayout: PageLayout = {
  pageHeader: [
    Component.IndexTitle(),
    Component.FullGraph({
      globalGraph: defaultGraphOptions,
      height: "500px", // Adjust this value to change graph height
    }),
  ],
  beforeBody: [
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.TagExplorer({
      tagNodeSort: "count-desc",
      fileNodeSort: "date-desc",
      excludeTags: ["private"],
      showFileCount: true,
      folderDefaultState: "collapsed",
      folderClickBehavior: "link",
    }),
  ],
  right: [
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
  afterBody: [
    Component.PostListing({
      excludeTags: ["private"],
      collapsedItemCount: 5,
      showEmptyMessage: false,
    }),
  ],
}
