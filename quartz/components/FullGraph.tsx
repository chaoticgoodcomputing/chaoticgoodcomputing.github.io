import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/graph/main.inline"
import style from "./styles/graph.scss"
import { classNames } from "../util/lang"
import { D3Config } from "./Graph"

interface FullGraphOptions {
  globalGraph: Partial<D3Config> | undefined
  height?: string
}

const defaultOptions: FullGraphOptions = {
  globalGraph: {
    drag: true,
    zoom: true,
    depth: -1,
    scale: 0.9,
    repelForce: 0.5,
    centerForce: 0.2,
    linkDistance: {
      tagTag: 30,
      tagPost: 30,
      postPost: 50,
    },
    fontSize: 0.6,
    opacityScale: 1,
    showTags: true,
    removeTags: [],
    focusOnHover: true,
  },
  height: "600px",
}

/**
 * FullGraph component - displays the global graph in full view without requiring a button click.
 * Designed for the homepage to show the entire site's connection graph immediately.
 */
export default ((opts?: Partial<FullGraphOptions>) => {
  const FullGraph: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
    const globalGraph = { ...defaultOptions.globalGraph, ...opts?.globalGraph }
    const height = opts?.height ?? defaultOptions.height
    return (
      <div class={classNames(displayClass, "full-graph")}>
        <div class="full-graph-outer active" style={`--graph-height: ${height}`}>
          <div class="full-graph-container" data-cfg={JSON.stringify(globalGraph)}></div>
        </div>
      </div>
    )
  }

  FullGraph.css = style + `
.full-graph {
  margin: 0;
  width: 100%;
  display: block;
}

.full-graph-outer {
  border-radius: 0.5rem;
  overflow: hidden;
  position: relative;
  background: var(--light);
  border: 1px solid var(--lightgray);
  display: block;
  height: var(--graph-height, 600px);
}

@media (max-width: 800px) {
  .full-graph-outer {
    height: clamp(300px, var(--graph-height, 600px), 400px);
  }
}

.full-graph-outer.active {
  display: block;
}

.full-graph-container {
  height: 100%;
  width: 100%;
}
`

  FullGraph.afterDOMLoaded = script

  return FullGraph
}) satisfies QuartzComponentConstructor
