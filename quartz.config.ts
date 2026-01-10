import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const RED = "#FF0000"
const ORANGE = "#de8200"
const YELLOW = "#FFD637"
const GREEN = "#00FF00"
const BLUE = "#0055ffff"
const VIOLET = "#8B00FF"
const BLUESTEEL = "#4682B4"

/**
 * Quartz 4 Configuration
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Chaotic Good Computing",
    pageTitleSuffix: " | CGC",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "chaoticgood.computer",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    tags: {
      colors: [
        // Top-level categories
        { tag: "engineering", color: RED },
        { tag: "economics", color: ORANGE },
        { tag: "horticulture", color: GREEN },
        { tag: "projects", color: BLUE },
        { tag: "writing", color: YELLOW },
        { tag: "private", color: BLUESTEEL },
      ],
      icons: [
        // Access/Privacy
        { tag: "private", icon: "mdi:lock" },
        
        // Specific Projects
        { tag: "projects/games/roblox", icon: "custom:roblox" },
        { tag: "projects/games/magic-atlas", icon: "mdi:cards-outline" },
        { tag: "projects/flowthru", icon: "mdi:graph-outline" },
        { tag: "projects/homelab", icon: "mdi:flask-outline" },
        
        // Programming Languages
        { tag: "engineering/languages/python", icon: "mdi:language-python" },
        { tag: "engineering/languages/typescript", icon: "mdi:language-typescript" },
        { tag: "engineering/languages/csharp", icon: "mdi:language-csharp" },
        { tag: "engineering/languages/lua", icon: "mdi:language-lua" },
        { tag: "engineering/languages/scratch", icon: "mdi:cat" },
        
        // Engineering Subtopics
        { tag: "engineering/bio", icon: "mdi:molecule" },
        { tag: "engineering/languages", icon: "mdi:code-braces" },
        { tag: "engineering/data", icon: "mdi:pulse" },
        { tag: "engineering/devops", icon: "mdi:truck" },
        { tag: "engineering/frontend", icon: "mdi:palette" },
        { tag: "engineering/ai", icon: "mdi:robot" },
        
        // Economics Subtopics
        { tag: "economics/strategy", icon: "mdi:arrow-decision" },
        { tag: "economics/finance", icon: "mdi:currency-usd" },
        { tag: "economics/markets", icon: "mdi:handshake" },
        
        // Project Types
        { tag: "projects/dayjob", icon: "mdi:vote" },
        { tag: "projects/games", icon: "mdi:controller-classic" },
        { tag: "projects/college", icon: "custom:uofu" },
        { tag: "projects/teaching", icon: "mdi:thought-bubble" },
        
        { tag: "writing/annotations", icon: "mdi:chat-plus" },
        { tag: "writing/articles", icon: "mdi:file-edit" },
        { tag: "writing/tutorials", icon: "mdi:school" },

        { tag: "horticulture/seasons", icon: "mdi:weather-sunny" },
        
        // Top-level Categories
        { tag: "engineering", icon: "mdi:tools" },
        { tag: "economics", icon: "mdi:chart-bell-curve" },
        { tag: "horticulture", icon: "mdi:flower" },
        { tag: "projects", icon: "mdi:folder-cog" },
        { tag: "writing", icon: "mdi:pencil" },
        
        // Seasonal Themes
        { tag: "horticulture/seasons/rhythm", icon: "mdi:music-note" },
        { tag: "horticulture/seasons/systems", icon: "mdi:transit-connection-variant" },
      ],
      defaultColor: "#888888",
      defaultIcon: null,
    },
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf8f8",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#4e4e4e",
          dark: "#2b2b2b",
          secondary: "#284b63",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#fff23688",
        },
        darkMode: {
          light: "#161618",
          lightgray: "#393639",
          gray: "#646464",
          darkgray: "#d4d4d4",
          dark: "#ebebec",
          secondary: "#7b97aa",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#b3aa0288",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.Annotations(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({
        enableInHtmlEmbed: false,
        enableCheckbox: true,
        parseTags: false,
      }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.TagIndex(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Plugin.CustomOgImages(),
    ],
  },
}

export default config
