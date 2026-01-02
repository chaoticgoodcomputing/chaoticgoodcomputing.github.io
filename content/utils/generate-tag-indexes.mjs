#!/usr/bin/env node

import { globby } from "globby"
import matter from "gray-matter"
import { mkdir, readFile, writeFile } from "fs/promises"
import { dirname, join } from "path"
import { existsSync } from "fs"

const PUBLIC_DIR = "public"
const CONTENT_DIR = join(PUBLIC_DIR, "content")
const TAGS_DIR = join(PUBLIC_DIR, "tags")

async function collectTags() {
  console.log("Collecting tags from markdown files...")

  // Find all markdown files in content directory
  const markdownFiles = await globby([`${CONTENT_DIR}/**/*.md`])

  const tags = new Set()

  for (const file of markdownFiles) {
    const content = await readFile(file, "utf8")
    const { data } = matter(content)

    // Extract tags from frontmatter
    if (data.tags && Array.isArray(data.tags)) {
      data.tags.forEach(tag => {
        if (tag && typeof tag === "string") {
          tags.add(tag)
        }
      })
    }
  }

  console.log(`Found ${tags.size} unique tags`)
  return Array.from(tags).sort()
}

async function generateTagIndex(tag) {
  const tagPath = join(TAGS_DIR, tag)
  const indexPath = join(tagPath, "index.md")

  // Check if index already exists
  if (existsSync(indexPath)) {
    return { tag, created: false }
  }

  // Get the tag name (last segment of the path)
  const tagName = tag.split("/").pop()

  // Create the directory structure if needed
  await mkdir(dirname(indexPath), { recursive: true })

  // Create the index file with frontmatter
  const content = `---
title: ${tagName}
---

`

  await writeFile(indexPath, content, "utf8")
  return { tag, created: true }
}

async function main() {
  try {
    // Collect all tags from markdown files
    const tags = await collectTags()

    console.log("\nGenerating tag index pages...")

    // Generate index files for each tag
    const results = await Promise.all(
      tags.map(tag => generateTagIndex(tag))
    )

    // Report results
    const created = results.filter(r => r.created)
    const skipped = results.filter(r => !r.created)

    console.log(`\n✓ Created ${created.length} new tag index pages`)
    if (created.length > 0) {
      created.forEach(({ tag }) => console.log(`  - ${tag}`))
    }

    console.log(`\n✓ Skipped ${skipped.length} existing tag index pages`)

  } catch (error) {
    console.error("Error generating tag indexes:", error)
    process.exit(1)
  }
}

main()
