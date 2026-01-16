#!/usr/bin/env node

/**
 * Publishes the resume PDF to the site assets if content has changed.
 * 
 * This script:
 * 1. Checks if the built resume PDF exists
 * 2. Compares checksums between built PDF and published PDF
 * 3. If different, copies the PDF and updates the resume.mdx date
 * 4. If same, does nothing (optimization for NX caching)
 */

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../..');

const SOURCE_PDF = path.join(workspaceRoot, 'dist/resume/resume.pdf');
const TARGET_PDF = path.join(workspaceRoot, 'content/public/assets/Elkington_Resume.pdf');
const RESUME_MDX = path.join(workspaceRoot, 'content/public/resume.mdx');

function calculateChecksum(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function updateMdxDate(mdxPath) {
  const content = fs.readFileSync(mdxPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];

  // Replace the date in frontmatter
  const updatedContent = content.replace(
    /^date: \d{4}-\d{2}-\d{2}$/m,
    `date: ${today}`
  );

  fs.writeFileSync(mdxPath, updatedContent, 'utf8');
  console.log(`✅ Updated ${path.relative(workspaceRoot, mdxPath)} date to ${today}`);
}

function main() {
  // Check if source PDF exists
  if (!fs.existsSync(SOURCE_PDF)) {
    console.log('⚠️  Source PDF not found. Run `nx run resume:build` first.');
    process.exit(1);
  }

  // Calculate checksums
  const sourceChecksum = calculateChecksum(SOURCE_PDF);
  const targetChecksum = calculateChecksum(TARGET_PDF);

  // Compare checksums
  if (sourceChecksum === targetChecksum) {
    console.log('✨ Resume PDF unchanged, skipping publish');
    process.exit(0);
  }

  // Ensure target directory exists
  const targetDir = path.dirname(TARGET_PDF);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy PDF
  fs.copyFileSync(SOURCE_PDF, TARGET_PDF);
  console.log(`✅ Published resume to ${path.relative(workspaceRoot, TARGET_PDF)}`);

  // Update MDX date
  updateMdxDate(RESUME_MDX);

  console.log('🎉 Resume published successfully!');
}

main();
