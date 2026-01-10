#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC_CONTENT_DIR = path.join(REPO_ROOT, 'content', 'public');
const TEMPLATES_DIR = path.join(PUBLIC_CONTENT_DIR, 'templates');
const ASSETS_DIR = path.join(PUBLIC_CONTENT_DIR, 'assets');

/**
 * Remove surrounding quotes from a string
 * @param {string} str - String to strip quotes from
 * @returns {string} - String without surrounding quotes
 */
function stripQuotes(str) {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}

/**
 * Extract frontmatter from markdown content
 * @param {string} content - Markdown file content
 * @returns {Object|null} - Parsed frontmatter or null if not found
 */
function extractFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return null;
  }

  const frontmatterText = match[1];
  const frontmatter = {};

  // Simple YAML parsing for tags (handles both array and single value) and description
  const lines = frontmatterText.split('\n');
  let inTagsArray = false;
  const tags = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('tags:')) {
      const afterColon = trimmedLine.slice(5).trim();
      if (afterColon) {
        // Inline tags: "tags: foo" or "tags: [foo, bar]"
        if (afterColon.startsWith('[') && afterColon.endsWith(']')) {
          const tagList = afterColon.slice(1, -1).split(',').map(t => stripQuotes(t.trim()));
          tags.push(...tagList);
        } else {
          tags.push(stripQuotes(afterColon));
        }
      } else {
        // Array format starts on next lines
        inTagsArray = true;
      }
    } else if (inTagsArray) {
      if (trimmedLine.startsWith('-')) {
        tags.push(stripQuotes(trimmedLine.slice(1).trim()));
      } else if (trimmedLine && !trimmedLine.startsWith('#')) {
        // End of tags array
        inTagsArray = false;
      }
    } else if (trimmedLine.startsWith('description:')) {
      const afterColon = trimmedLine.slice(12).trim();
      if (afterColon) {
        frontmatter.description = stripQuotes(afterColon);
      }
    }
  }

  frontmatter.tags = tags;
  return frontmatter;
}

/**
 * Check if a file should be skipped (has 'private' tag or description field)
 * @param {string} filePath - Path to the markdown file
 * @returns {Promise<boolean>} - True if file should be skipped
 */
async function shouldSkipFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const frontmatter = extractFrontmatter(content);

    if (!frontmatter) {
      return false;
    }

    // Skip if has 'private' tag
    const hasPrivateTag = frontmatter.tags && frontmatter.tags.some(tag => tag === 'private');

    // Skip if has description field
    const hasDescription = frontmatter.description !== undefined;

    return hasPrivateTag || hasDescription;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Recursively find all markdown files in a directory
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>} - Array of file paths
 */
async function findMarkdownFiles(dir) {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await findMarkdownFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }

  return files;
}

/**
 * Main function
 */
async function main() {
  console.log('Scanning for non-private markdown files in content/public...\n');

  const allMarkdownFiles = await findMarkdownFiles(PUBLIC_CONTENT_DIR);
  const nonPrivateFiles = [];

  for (const filePath of allMarkdownFiles) {
    // Skip files in templates or assets directories
    if (filePath.startsWith(TEMPLATES_DIR) || filePath.startsWith(ASSETS_DIR)) {
      continue;
    }
    
    const shouldSkip = await shouldSkipFile(filePath);
    if (!shouldSkip) {
      // Convert to relative path from repo root
      const relativePath = path.relative(REPO_ROOT, filePath);
      nonPrivateFiles.push(relativePath);
    }
  }

  // Print results
  if (nonPrivateFiles.length === 0) {
    console.log('No non-private files found.');
  } else {
    console.log(`Found ${nonPrivateFiles.length} non-private file(s):\n`);
    for (const filePath of nonPrivateFiles.sort()) {
      console.log(filePath);
    }
  }
}

main().catch(console.error);
