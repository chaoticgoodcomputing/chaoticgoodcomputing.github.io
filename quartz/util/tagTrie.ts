import { ContentDetails } from "../plugins/emitters/contentIndex"
import { FullSlug } from "./path"

interface FileTrieData {
  slug: string
  title: string
  filePath: string
}

/**
 * Tag-based trie structure for organizing content by tags.
 * Unlike FileTrieNode, files appear at leaf tag nodes only (not at intermediate levels).
 * 
 * Example structure for file with tags ["notes", "engineering/typescript"]:
 *   Root
 *   ├── notes
 *   │   └── [file]
 *   └── engineering
 *       └── typescript
 *           └── [file]
 */
export class TagTrieNode<T extends FileTrieData = ContentDetails> {
  tagSegment: string              // Current segment: "typescript"
  fullTagPath: string             // Full path: "engineering/typescript"
  files: T[]                      // Files with this exact tag
  children: TagTrieNode<T>[]      // Sub-tags

  constructor(pathSegments: string[], segment: string) {
    this.tagSegment = segment
    this.fullTagPath = pathSegments.join("/")
    this.files = []
    this.children = []
  }

  /**
   * Get total file count for this node and all descendants
   */
  get totalFileCount(): number {
    return (
      this.files.length + this.children.reduce((sum, child) => sum + child.totalFileCount, 0)
    )
  }

  /**
   * Check if this node has children
   */
  get hasChildren(): boolean {
    return this.children.length > 0
  }

  /**
   * Insert file at specific tag path
   */
  private insert(tagPath: string[], file: T) {
    if (tagPath.length === 0) return

    const segment = tagPath[0]

    if (tagPath.length === 1) {
      // Leaf node: add file here
      let child = this.children.find((c) => c.tagSegment === segment)
      if (!child) {
        const fullPath = [...this.fullTagPath.split("/").filter(Boolean), segment]
        child = new TagTrieNode<T>(fullPath, segment)
        this.children.push(child)
      }
      child.files.push(file)
    } else {
      // Intermediate node: recurse to child
      let child = this.children.find((c) => c.tagSegment === segment)
      if (!child) {
        const fullPath = [...this.fullTagPath.split("/").filter(Boolean), segment]
        child = new TagTrieNode<T>(fullPath, segment)
        this.children.push(child)
      }
      child.insert(tagPath.slice(1), file)
    }
  }

  /**
   * Build TagTrieNode from content entries, filtering tags before construction
   */
  static fromTaggedEntries<T extends FileTrieData>(
    entries: [FullSlug, T][],
    excludeTags: string[] = [],
  ): TagTrieNode<T> {
    const root = new TagTrieNode<T>([], "")

    for (const [_, content] of entries) {
      const tags = ((content as any).tags ?? []) as string[]

      // Skip files that have any excluded tags
      const hasExcludedTag = tags.some((tag) => excludeTags.includes(tag))
      if (hasExcludedTag) {
        continue
      }

      // Add file to each tag location
      for (const tag of tags) {
        root.insert(tag.split("/"), content)
      }
    }

    return root
  }

  /**
   * Filter trie nodes. Behaves similar to Array.prototype.filter(), but modifies tree in place
   */
  filter(filterFn: (node: TagTrieNode<T>) => boolean) {
    this.children = this.children.filter(filterFn)
    this.children.forEach((child) => child.filter(filterFn))
  }

  /**
   * Map over trie nodes. Behaves similar to Array.prototype.map(), but modifies tree in place
   */
  map(mapFn: (node: TagTrieNode<T>) => void) {
    mapFn(this)
    this.children.forEach((child) => child.map(mapFn))
  }

  /**
   * Sort trie nodes according to sort/compare function
   */
  sort(sortFn: (a: TagTrieNode<T>, b: TagTrieNode<T>) => number) {
    this.children = this.children.sort(sortFn)
    this.children.forEach((child) => child.sort(sortFn))
  }

  /**
   * Get all tag paths in the trie
   */
  getTagPaths(): string[] {
    const paths: string[] = []
    const traverse = (node: TagTrieNode<T>) => {
      if (node.fullTagPath) {
        paths.push(node.fullTagPath)
      }
      node.children.forEach(traverse)
    }
    traverse(this)
    return paths
  }
}
