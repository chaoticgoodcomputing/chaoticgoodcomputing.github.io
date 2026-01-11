#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'fs/promises';
import { resolve, join } from 'path';

const inputDir = resolve(process.cwd(), 'utils/lighthouse/raw/lhci');
const outputPath = resolve(process.cwd(), 'utils/lighthouse/assets/lighthouse-insights-multi.json');

async function aggregateResults() {
  console.log('📂 Reading Lighthouse CI reports...');

  // Read manifest to understand the structure
  const manifestPath = join(inputDir, 'manifest.json');
  const manifestData = await readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestData);

  const allReports = [];
  const files = await readdir(inputDir);

  // Read all JSON report files (excluding manifest)
  for (const file of files) {
    if (file.endsWith('.json') && file !== 'manifest.json') {
      const reportPath = join(inputDir, file);
      const reportData = await readFile(reportPath, 'utf-8');
      allReports.push(JSON.parse(reportData));
    }
  }

  console.log(`📊 Processing ${allReports.length} reports...`);

  // Group reports by URL
  const reportsByUrl = {};
  for (const report of allReports) {
    const url = report.finalUrl || report.requestedUrl;
    if (!reportsByUrl[url]) {
      reportsByUrl[url] = [];
    }
    reportsByUrl[url].push(report);
  }

  const pageResults = [];

  // Aggregate data for each URL
  for (const [url, reports] of Object.entries(reportsByUrl)) {
    const scores = {
      performance: [],
      accessibility: [],
      bestPractices: [],
      seo: [],
    };

    const metrics = {
      'first-contentful-paint': [],
      'largest-contentful-paint': [],
      'total-blocking-time': [],
      'cumulative-layout-shift': [],
      'speed-index': [],
    };

    // Collect all scores and metrics
    for (const report of reports) {
      if (report.categories) {
        scores.performance.push(report.categories.performance?.score * 100 || 0);
        scores.accessibility.push(report.categories.accessibility?.score * 100 || 0);
        scores.bestPractices.push(report.categories['best-practices']?.score * 100 || 0);
        scores.seo.push(report.categories.seo?.score * 100 || 0);
      }

      if (report.audits) {
        for (const metricId of Object.keys(metrics)) {
          const audit = report.audits[metricId];
          if (audit?.numericValue !== undefined && audit.numericValue !== null) {
            metrics[metricId].push(audit.numericValue);
          }
        }
      }
    }

    // Calculate median scores
    const median = (arr) => {
      if (arr.length === 0) return null;
      const sorted = arr.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    };

    pageResults.push({
      url,
      runs: reports.length,
      scores: {
        performance: Math.round(median(scores.performance) || 0),
        accessibility: Math.round(median(scores.accessibility) || 0),
        bestPractices: Math.round(median(scores.bestPractices) || 0),
        seo: Math.round(median(scores.seo) || 0),
      },
      metrics: {
        'first-contentful-paint': median(metrics['first-contentful-paint']),
        'largest-contentful-paint': median(metrics['largest-contentful-paint']),
        'total-blocking-time': median(metrics['total-blocking-time']),
        'cumulative-layout-shift': median(metrics['cumulative-layout-shift']),
        'speed-index': median(metrics['speed-index']),
      },
    });
  }

  // Calculate overall statistics
  const allScores = {
    performance: pageResults.map(p => p.scores.performance),
    accessibility: pageResults.map(p => p.scores.accessibility),
    bestPractices: pageResults.map(p => p.scores.bestPractices),
    seo: pageResults.map(p => p.scores.seo),
  };

  const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const min = (arr) => Math.min(...arr);
  const max = (arr) => Math.max(...arr);

  const summary = {
    metadata: {
      totalPages: pageResults.length,
      totalRuns: allReports.length,
      timestamp: new Date().toISOString(),
      lighthouseVersion: allReports[0]?.lighthouseVersion,
    },
    overall: {
      performance: {
        average: Math.round(average(allScores.performance)),
        min: min(allScores.performance),
        max: max(allScores.performance),
      },
      accessibility: {
        average: Math.round(average(allScores.accessibility)),
        min: min(allScores.accessibility),
        max: max(allScores.accessibility),
      },
      bestPractices: {
        average: Math.round(average(allScores.bestPractices)),
        min: min(allScores.bestPractices),
        max: max(allScores.bestPractices),
      },
      seo: {
        average: Math.round(average(allScores.seo)),
        min: min(allScores.seo),
        max: max(allScores.seo),
      },
    },
    pages: pageResults,
    worstPerformers: {
      performance: [...pageResults].sort((a, b) => a.scores.performance - b.scores.performance).slice(0, 5),
      accessibility: [...pageResults].sort((a, b) => a.scores.accessibility - b.scores.accessibility).slice(0, 5),
    },
  };

  await writeFile(outputPath, JSON.stringify(summary, null, 2));

  console.log(`\n✅ Aggregated results saved to ${outputPath}`);
  console.log(`\n📊 Overall Scores (${summary.metadata.totalPages} pages):`);
  console.log(`  Performance:     ${summary.overall.performance.average} (${summary.overall.performance.min}-${summary.overall.performance.max})`);
  console.log(`  Accessibility:   ${summary.overall.accessibility.average} (${summary.overall.accessibility.min}-${summary.overall.accessibility.max})`);
  console.log(`  Best Practices:  ${summary.overall.bestPractices.average} (${summary.overall.bestPractices.min}-${summary.overall.bestPractices.max})`);
  console.log(`  SEO:             ${summary.overall.seo.average} (${summary.overall.seo.min}-${summary.overall.seo.max})`);

  console.log(`\n⚠️  Worst Performance (${summary.worstPerformers.performance[0].scores.performance}/100):`);
  console.log(`  ${summary.worstPerformers.performance[0].url}`);

  if (summary.worstPerformers.accessibility[0].scores.accessibility < 100) {
    console.log(`\n♿ Worst Accessibility (${summary.worstPerformers.accessibility[0].scores.accessibility}/100):`);
    console.log(`  ${summary.worstPerformers.accessibility[0].url}`);
  }
}

aggregateResults().catch((error) => {
  console.error('❌ Error aggregating results:', error);
  process.exit(1);
});
