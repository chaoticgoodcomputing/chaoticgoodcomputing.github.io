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
  scale: 0.75,
  linkStrength: {
    tagTag: 0.375,
    tagPost: 0.25,
    postPost: 0.125
  },
  edgeOpacity: {
    tagTag: { min: 1, max: 1.0 },
    tagPost: { min: 0.05, max: 1.0 },
    postPost: { min: 0.03, max: 1.0 }
  },
  repelForce: 0.5,
  centerForce: 0.375,
  linkDistance: {
    tagTag: 45,
    tagPost: 90,
    postPost: 135
  },
  baseSize: {
    tags: 4,
    posts: 3
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
  labelAnchor: {
    baseY: 1.2,
    scaleFactor: 0.1
  },
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
    Component.Graph({
      localGraph: graphOptions,
      globalGraph: graphOptions
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
    Component.Graph({
      localGraph: graphOptions,
      globalGraph: graphOptions
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
