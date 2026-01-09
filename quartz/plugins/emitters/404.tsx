import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import MobileSidebarMenuConstructor from "../../components/MobileSidebarMenu"
import { pageResources, renderPage } from "../../components/renderPage"
import { FullPageLayout } from "../../cfg"
import { FullSlug } from "../../util/path"
import { sharedPageComponents } from "../../layouts/shared.layout"
import { notFoundLayout } from "../../layouts/404.layout"
import { defaultProcessedContent } from "../vfile"
import { write } from "./helpers"
import { i18n } from "../../i18n"

export const NotFoundPage: QuartzEmitterPlugin = () => {
  const { head: Head, header, footer: Footer } = sharedPageComponents
  const Header = HeaderConstructor()
  const Body = BodyConstructor()
  const MobileSidebarMenu = MobileSidebarMenuConstructor()

  const opts: FullPageLayout = {
    ...sharedPageComponents,
    ...notFoundLayout,
  }

  return {
    name: "404Page",
    getQuartzComponents() {
      const layoutComponents = [
        ...(notFoundLayout.pageHeader || []),
        ...notFoundLayout.beforeBody,
        ...(notFoundLayout.body || []),
        ...notFoundLayout.left,
        ...notFoundLayout.right,
        ...(notFoundLayout.afterBody || []),
      ]

      return [Head, Header, Body, MobileSidebarMenu, ...header, ...layoutComponents, Footer]
    },
    async *emit(ctx, _content, resources) {
      const cfg = ctx.cfg.configuration
      const slug = "404" as FullSlug

      const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
      const path = url.pathname as FullSlug
      const notFound = i18n(cfg.locale).pages.error.title
      const [tree, vfile] = defaultProcessedContent({
        slug,
        text: notFound,
        description: notFound,
        frontmatter: { title: notFound, tags: [] },
      })
      const externalResources = pageResources(path, resources)

      // Extract all file data from content for PostListing component
      const allFiles = _content.map((c) => c[1].data)

      const componentData: QuartzComponentProps = {
        ctx,
        fileData: vfile.data,
        externalResources,
        cfg,
        children: [],
        tree,
        allFiles,
      }

      yield write({
        ctx,
        content: renderPage(cfg, slug, componentData, opts, externalResources),
        slug,
        ext: ".html",
      })
    },
    async *partialEmit() { },
  }
}
