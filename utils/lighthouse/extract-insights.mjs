#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

// Get base filename from command line args, default to 'lighthouse-report'
const baseFilename = process.argv[2] || 'lighthouse-report';

const inputPath = resolve(process.cwd(), `utils/lighthouse/raw/${baseFilename}.report.json`);
const outputPath = resolve(process.cwd(), `utils/lighthouse/assets/${baseFilename.replace('lighthouse-report', 'lighthouse-insights')}.json`);

async function extractInsights() {
  const rawData = await readFile(inputPath, 'utf-8');
  const report = JSON.parse(rawData);

  const insights = {
    metadata: {
      fetchTime: report.fetchTime,
      finalUrl: report.finalUrl,
      lighthouseVersion: report.lighthouseVersion,
    },
    scores: {
      performance: report.categories.performance?.score * 100,
      accessibility: report.categories.accessibility?.score * 100,
      bestPractices: report.categories['best-practices']?.score * 100,
      seo: report.categories.seo?.score * 100,
    },
    metrics: {},
    opportunities: [],
    diagnostics: [],
    failedAudits: [],
    warnings: [],
  };

  // Extract core metrics
  const metricsToExtract = [
    'first-contentful-paint',
    'largest-contentful-paint',
    'total-blocking-time',
    'cumulative-layout-shift',
    'speed-index',
    'interactive',
  ];

  for (const metricId of metricsToExtract) {
    const audit = report.audits[metricId];
    if (audit) {
      insights.metrics[metricId] = {
        title: audit.title,
        displayValue: audit.displayValue,
        score: audit.score,
        numericValue: audit.numericValue,
        numericUnit: audit.numericUnit,
      };
    }
  }

  // Extract opportunities (performance improvements)
  for (const [auditId, audit] of Object.entries(report.audits)) {
    if (audit.details?.type === 'opportunity' && audit.score !== null && audit.score < 1) {
      insights.opportunities.push({
        id: auditId,
        title: audit.title,
        description: audit.description,
        displayValue: audit.displayValue,
        score: audit.score,
        numericValue: audit.numericValue,
        numericUnit: audit.numericUnit,
      });
    }
  }

  // Extract diagnostics (performance issues)
  for (const [auditId, audit] of Object.entries(report.audits)) {
    if (
      audit.details?.type === 'table' &&
      audit.score !== null &&
      audit.score < 1 &&
      !audit.details?.type?.includes('opportunity')
    ) {
      insights.diagnostics.push({
        id: auditId,
        title: audit.title,
        description: audit.description,
        displayValue: audit.displayValue,
        score: audit.score,
      });
    }
  }

  // Extract failed audits (accessibility, SEO, best practices)
  for (const [auditId, audit] of Object.entries(report.audits)) {
    if (audit.score !== null && audit.score < 1 && audit.scoreDisplayMode === 'binary') {
      insights.failedAudits.push({
        id: auditId,
        title: audit.title,
        description: audit.description,
        score: audit.score,
      });
    }
  }

  // Extract warnings
  if (report.runWarnings && report.runWarnings.length > 0) {
    insights.warnings = report.runWarnings;
  }

  // Sort opportunities by potential savings
  insights.opportunities.sort((a, b) => (b.numericValue || 0) - (a.numericValue || 0));

  await writeFile(outputPath, JSON.stringify(insights, null, 2));
  console.log(`✅ Extracted insights to ${outputPath}`);
  console.log(`\n📊 Scores:`);
  console.log(`  Performance:     ${insights.scores.performance?.toFixed(0) || 'N/A'}`);
  console.log(`  Accessibility:   ${insights.scores.accessibility?.toFixed(0) || 'N/A'}`);
  console.log(`  Best Practices:  ${insights.scores.bestPractices?.toFixed(0) || 'N/A'}`);
  console.log(`  SEO:             ${insights.scores.seo?.toFixed(0) || 'N/A'}`);
  console.log(`\n🔍 Found:`);
  console.log(`  ${insights.opportunities.length} opportunities`);
  console.log(`  ${insights.diagnostics.length} diagnostics`);
  console.log(`  ${insights.failedAudits.length} failed audits`);
  console.log(`  ${insights.warnings.length} warnings`);
}

extractInsights().catch((error) => {
  console.error('Error extracting insights:', error);
  process.exit(1);
});
