import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import { D3Config } from "./quartz/components/Graph"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/jackyzha0/quartz",
      "Discord Community": "https://discord.gg/cRFFHYye7t",
    },
  }),
}

const graphOptions = {
  scale: 1,
  linkStrength: {
    tagTag: 1,
    tagPost: 0.5,
    postPost: 0.1
  },
  edgeOpacity: {
    min: 0,
    max: 1
  },
  repelForce: 0.25,
  centerForce: 1,
  linkDistance: {
    tagTag: 50,
    tagPost: 50,
    postPost: 100
  },
  baseSize: {
    tags: 3,
    posts: 1
  },
  tagColorGradient: [
    "#FF0000",
    "#FF7F00",
    "#FFFF00",
    "#00FF00",
    "#0000FF",
    "#4B0082",
    "#9400D3"
  ],
} as Partial<D3Config>

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
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
      tagNodeSort: "count-desc",        // Most popular tags first
      fileNodeSort: "date-desc",        // Newest files first
      excludeTags: ["private"],         // Hide private content
      showFileCount: true,              // Show (200) counts
      folderDefaultState: "collapsed",
      folderClickBehavior: "link",      // Tags link to /tags/{path}
    }),
  ],
  right: [
    Component.Graph({
      localGraph: graphOptions,
      globalGraph: graphOptions
    }),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.TagExplorer({
      tagNodeSort: "count-desc",        // Most popular tags first
      fileNodeSort: "date-desc",        // Newest files first
      excludeTags: ["private"],         // Hide private content
      showFileCount: true,              // Show (200) counts
      folderDefaultState: "collapsed",
      folderClickBehavior: "link",      // Tags link to /tags/{path}
    }),
  ],
  right: [],
}
