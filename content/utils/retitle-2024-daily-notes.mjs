#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const START_DATE = new Date('2024-02-25');
const BASE_DIR = join(__dirname, '../private/content/notes/periodic/daily/2024');

/**
 * Check if a title is a date string (YYYY-MM-DD format)
 */
function isDateTitle(title) {
  return /^\d{4}-\d{2}-\d{2}$/.test(title);
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
  return Math.round((date2 - date1) / oneDay);
}

/**
 * Process a single markdown file
 */
async function processFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    
    // Extract the title from frontmatter
    const titleMatch = content.match(/^---\s*\ntitle:\s*"([^"]+)"/m);
    if (!titleMatch) {
      console.log(`⚠️  No title found in ${filePath}`);
      return;
    }
    
    const currentTitle = titleMatch[1];
    
    // Skip if title is not a date
    if (!isDateTitle(currentTitle)) {
      console.log(`⏭️  Skipping ${filePath} - title "${currentTitle}" is not a date`);
      return;
    }
    
    // Calculate day number
    const noteDate = new Date(currentTitle);
    const dayNumber = daysBetween(START_DATE, noteDate) + 1;
    
    if (dayNumber < 1) {
      console.log(`⚠️  Skipping ${filePath} - date is before start date`);
      return;
    }
    
    const newTitle = `Rhythm: Day ${dayNumber}`;
    
    // Replace the title in the content
    const updatedContent = content.replace(
      /^(---\s*\n)title:\s*"[^"]+"/m,
      `$1title: "${newTitle}"`
    );
    
    // Write the updated content back
    await writeFile(filePath, updatedContent, 'utf-8');
    console.log(`✅ ${filePath}: "${currentTitle}" → "${newTitle}"`);
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Recursively find all markdown files in a directory
 */
async function findMarkdownFiles(dir) {
  const files = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...await findMarkdownFiles(fullPath));
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
 * Main execution
 */
async function main() {
  console.log('🔍 Finding markdown files in:', BASE_DIR);
  console.log(`📅 Start date: ${START_DATE.toISOString().split('T')[0]}\n`);
  
  const files = await findMarkdownFiles(BASE_DIR);
  console.log(`📝 Found ${files.length} markdown files\n`);
  
  for (const file of files) {
    await processFile(file);
  }
  
  console.log('\n✨ Done!');
}

main();
