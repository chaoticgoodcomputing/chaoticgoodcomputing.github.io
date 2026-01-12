#!/usr/bin/env node
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const TYPST_FILE = 'resume/resume.typ';
const TIMEOUT_SECONDS = 10;

// HTTP status codes that indicate bot protection or similar issues
// These are treated as warnings rather than errors
const WARNING_STATUS_CODES = [
  403, // Forbidden - often used for bot protection
  999  // Non-standard - LinkedIn uses this to block bots
];

/**
 * Check if a status code should be treated as a warning rather than error
 */
function isWarningStatusCode(statusCode) {
  return WARNING_STATUS_CODES.includes(statusCode);
}

/**
 * Extracts URLs from Typst link() calls in the file
 */
function extractLinks(content) {
  // Match #link("url") or link("url") patterns
  const linkPattern = /#?link\("([^"]+)"\)/g;
  const links = [];
  let match;

  while ((match = linkPattern.exec(content)) !== null) {
    const url = match[1];
    // Filter out mailto links
    if (!url.startsWith('mailto:')) {
      links.push(url);
    }
  }

  return [...new Set(links)]; // Remove duplicates
}

/**
 * Checks if a URL is accessible using curl
 * First tries HEAD request, falls back to GET with limited response if that fails
 */
function checkUrl(url) {
  // Try HEAD request first (faster, less bandwidth)
  try {
    execSync(
      `curl -s -f -L -I --max-time ${TIMEOUT_SECONDS} -A "Mozilla/5.0" "${url}"`,
      { stdio: 'pipe' }
    );
    return { success: true, method: 'HEAD' };
  } catch (headError) {
    // HEAD failed, try GET request with limited response
    // Some sites (like LinkedIn, SPAs) don't handle HEAD well
    try {
      const result = execSync(
        `curl -s -L --max-time ${TIMEOUT_SECONDS} -A "Mozilla/5.0" -w "%{http_code}" -o /dev/null "${url}"`,
        { encoding: 'utf-8' }
      );
      const statusCode = parseInt(result.trim());
      
      // Consider 2xx and 3xx as success
      if (statusCode >= 200 && statusCode < 400) {
        return { success: true, method: 'GET', statusCode };
      }
      
      return { 
        success: false, 
        message: `HTTP ${statusCode}`,
        statusCode 
      };
    } catch (getError) {
      return { 
        success: false, 
        message: `Both HEAD and GET requests failed: ${getError.message}`
      };
    }
  }
}

// Main execution
console.log('🔍 Scanning resume.typ for links...\n');

const content = readFileSync(TYPST_FILE, 'utf-8');
const links = extractLinks(content);

console.log(`Found ${links.length} unique link(s) to check:\n`);

let brokenLinks = [];
let warnings = [];

for (const url of links) {
  process.stdout.write(`  Checking: ${url} ... `);
  const result = checkUrl(url);
  
  if (result.success) {
    console.log('✅');
  } else if (result.statusCode && isWarningStatusCode(result.statusCode)) {
    // Treat certain status codes as warnings (likely bot protection)
    console.log('⚠️  (bot protection suspected)');
    warnings.push({ url, statusCode: result.statusCode, message: result.message });
  } else {
    console.log('❌');
    brokenLinks.push({ url, error: result.message });
  }
}

console.log('');

// Display warnings (non-blocking)
if (warnings.length > 0) {
  console.log(`⚠️  Found ${warnings.length} link(s) with suspected bot protection:\n`);
  warnings.forEach(({ url, statusCode, message }) => {
    console.log(`  - ${url}`);
    console.log(`    Status: HTTP ${statusCode} (may block automated requests)`);
  });
  console.log('\n  💡 These links may work fine in a browser. Verify manually if needed.\n');
}

// Display errors (blocking)
if (brokenLinks.length > 0) {
  console.error(`❌ Found ${brokenLinks.length} broken link(s):\n`);
  brokenLinks.forEach(({ url, error }) => {
    console.error(`  - ${url}`);
    if (error) {
      console.error(`    Error: ${error}`);
    }
  });
  process.exit(1);
}

// Success
if (warnings.length === 0) {
  console.log('✅ All links are accessible!');
} else {
  console.log('✅ All links passed (with warnings noted above)');
}
process.exit(0);
