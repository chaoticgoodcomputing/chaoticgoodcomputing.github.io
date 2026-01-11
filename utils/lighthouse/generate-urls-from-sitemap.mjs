#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

const sitemapPath = resolve(process.cwd(), 'public/sitemap.xml');
const outputPath = resolve(process.cwd(), 'utils/lighthouse/lighthouserc.cjs');

// Configuration
const MAX_URLS = parseInt(process.env.LHCI_MAX_URLS || '10', 10);
const BASE_URL = process.env.LHCI_BASE_URL || 'http://localhost:8080';
const NUMBER_OF_RUNS = parseInt(process.env.LHCI_RUNS || '1', 10);

async function generateConfig() {
  console.log('📖 Reading sitemap from public/sitemap.xml...');
  const sitemapXML = await readFile(sitemapPath, 'utf-8');

  console.log('🔍 Parsing sitemap XML...');
  const sitemap = await parseXML(sitemapXML);

  const urls = sitemap.urlset.url.map(entry => {
    const loc = entry.loc[0];
    // Convert production URLs to localhost
    return loc.replace(/https?:\/\/[^/]+/, BASE_URL);
  });

  console.log(`📊 Found ${urls.length} URLs in sitemap`);

  // Limit URLs for reasonable CI time
  const selectedUrls = urls.slice(0, MAX_URLS);
  console.log(`✂️  Limited to ${selectedUrls.length} URLs (max: ${MAX_URLS})`);

  // Generate lighthouserc.js configuration
  const config = `module.exports = {
  ci: {
    collect: {
      url: ${JSON.stringify(selectedUrls, null, 6)},
      numberOfRuns: ${NUMBER_OF_RUNS},
    },
    upload: {
      target: 'filesystem',
      outputDir: './utils/lighthouse/raw/lhci',
    },
    storageDir: './utils/lighthouse/.lighthouseci',
  },
};
`;

  await writeFile(outputPath, config);
  console.log(`✅ Generated utils/lighthouse/lighthouserc.cjs with ${selectedUrls.length} URLs`);
  console.log(`📁 Reports will be saved to utils/lighthouse/raw/lhci/`);
}

generateConfig().catch((error) => {
  console.error('❌ Error generating Lighthouse CI config:', error);
  process.exit(1);
});
