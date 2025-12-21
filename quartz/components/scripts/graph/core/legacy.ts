// NOTE: Compatibility barrel.
// The real implementation lives in `quartz/components/scripts/graph/core/*` and `graph/adapters/*`.
// New code should import from `../core` (or a specific module) and avoid underscore-prefixed names.

export type { LinkType, LinkData, NodeData, SimpleLinkData } from "./types"

export {
  parseGraphConfig,
  fetchAndTransformData,
  buildTagFileCountMap,
  buildTagColorMap,
  calculateEdgeOpacity,
  buildLinksAndTags,
  calculateNeighborhood,
  constructGraphNodes,
  constructGraphData,
  createNodeRadiusFunction,
  setupSimulation,
} from "./index"

// Deprecated underscore aliases kept temporarily for any leftover internal imports.
export {
  parseGraphConfig as _parseGraphConfig,
  fetchAndTransformData as _fetchAndTransformData,
  buildTagFileCountMap as _buildTagFileCountMap,
  buildTagColorMap as _buildTagColorMap,
  calculateEdgeOpacity as _calculateEdgeOpacity,
  buildLinksAndTags as _buildLinksAndTags,
  calculateNeighborhood as _calculateNeighborhood,
  constructGraphNodes as _constructGraphNodes,
  constructGraphData as _constructGraphData,
  createNodeRadiusFunction as _createNodeRadiusFunction,
  setupSimulation as _setupSimulation,
} from "./index"

export { getVisited as _getVisited, addToVisited as _addToVisited } from "../adapters/visited"
