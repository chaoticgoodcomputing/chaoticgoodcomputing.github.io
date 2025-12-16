#!/usr/bin/env node

import { globby } from "globby"
import matter from "gray-matter"
import { mkdir, readFile, writeFile } from "fs/promises"
import { dirname, relative, join } from "path"
import { existsSync } from "fs"

const PRIVATE_DIR = "content/private"
const PUBLIC_DIR = "content/public"
const PRIVATE_BODY_FILE = "content/public/assets/PRIVATE_FILE_BODY.md"

/**
 * Extract frontmatter from private markdown files and create cleaned versions
 * in the public directory, preserving the directory structure.
 * 
 * Files that already exist in content/public are skipped (public content takes precedence).
 */
async function extractPrivateMetadata() {
  console.log("🔍 Scanning for private markdown files...")
  
  // Read the private file body template
  let privateBodyContent = "*This is a private note. Only metadata is publicly available.*\n"
  try {
    privateBodyContent = await readFile(PRIVATE_BODY_FILE, "utf-8")
  } catch (error) {
    console.log("⚠️  Could not read PRIVATE_FILE_BODY.md, using default message")
  }
  
  // Find all markdown files in the private directory
  const privateFiles = await globby([`${PRIVATE_DIR}/**/*.md`], {
    ignore: ["**/node_modules/**", "**/.git/**"],
  })
  
  if (privateFiles.length === 0) {
    console.log("ℹ️  No private markdown files found.")
    return
  }
  
  console.log(`📄 Found ${privateFiles.length} private file(s)`)
  
  let extracted = 0
  let skipped = 0
  let errors = 0
  
  for (const privateFilePath of privateFiles) {
    try {
      // Calculate the relative path from private dir
      const relativePath = relative(PRIVATE_DIR, privateFilePath)
      const publicFilePath = join(PUBLIC_DIR, relativePath)
      
      // Read the private file
      const content = await readFile(privateFilePath, "utf-8")
      
      // Parse frontmatter
      const { data: frontmatter } = matter(content)
      
      // Create a markdown file with only frontmatter
      let cleanedContent = ""
      
      if (Object.keys(frontmatter).length > 0) {
        // Convert frontmatter back to YAML
        cleanedContent = "---\n"
        for (const [key, value] of Object.entries(frontmatter)) {
          if (Array.isArray(value)) {
            cleanedContent += `${key}:\n`
            for (const item of value) {
              cleanedContent += `  - ${JSON.stringify(item)}\n`
            }
          } else if (typeof value === "string" && value.includes("\n")) {
            cleanedContent += `${key}: |\n${value.split("\n").map(line => `  ${line}`).join("\n")}\n`
          } else {
            cleanedContent += `${key}: ${JSON.stringify(value)}\n`
          }
        }
        cleanedContent += "---\n\n"
      }
      
      cleanedContent += privateBodyContent
      
      // Rewrite links from private/ to public/ paths
      cleanedContent = cleanedContent.replace(/private\/([\w\-\/\.]+)/g, 'public/$1')
      
      // Ensure the directory exists
      await mkdir(dirname(publicFilePath), { recursive: true })
      
      // Write the cleaned file
      await writeFile(publicFilePath, cleanedContent, "utf-8")
      
      console.log(`✅ Extracted ${relativePath}`)
      extracted++
      
    } catch (error) {
      console.error(`❌ Error processing ${privateFilePath}:`, error instanceof Error ? error.message : error)
      errors++
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Extracted: ${extracted}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Errors: ${errors}`)
  
  // Fix links in all public markdown files
  await fixLinksInPublicFiles()
}

/**
 * Fix links in public markdown files that point to private/ paths
 */
async function fixLinksInPublicFiles() {
  console.log(`\n🔗 Fixing links in public markdown files...`)
  
  const publicFiles = await globby([`${PUBLIC_DIR}/**/*.md`], {
    ignore: ["**/node_modules/**", "**/.git/**"],
  })
  
  let fixed = 0
  
  for (const publicFilePath of publicFiles) {
    try {
      let content = await readFile(publicFilePath, "utf-8")
      const originalContent = content
      
      // Replace private/ links with public/ links
      content = content.replace(/private\/([\w\-\/\.]+)/g, 'public/$1')
      
      // Only write if changes were made
      if (content !== originalContent) {
        await writeFile(publicFilePath, content, "utf-8")
        const relativePath = relative(PUBLIC_DIR, publicFilePath)
        console.log(`  ✅ Fixed links in ${relativePath}`)
        fixed++
      }
    } catch (error) {
      console.error(`  ❌ Error fixing links in ${publicFilePath}:`, error instanceof Error ? error.message : error)
    }
  }
  
  if (fixed > 0) {
    console.log(`\n🔗 Fixed links in ${fixed} file(s)`)
  } else {
    console.log(`\n🔗 No link fixes needed`)
  }
}

// Run the extraction
extractPrivateMetadata().catch((error) => {
  console.error("💥 Fatal error:", error)
  process.exit(1)
})
