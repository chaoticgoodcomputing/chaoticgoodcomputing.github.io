<%*
// Configuration
const SEASONS_FOLDER = "tags/seasons";
const DAILY_NOTES_FOLDER = "content/notes/periodic/daily";

// Find the most recent season by date
const latestSeason = app.vault.getMarkdownFiles()
  .filter(file => file.path.startsWith(SEASONS_FOLDER))
  .reduce((latest, file) => {
    const createdAt = app.metadataCache.getFileCache(file)?.frontmatter?.date;
    if (!createdAt) return latest;
    
    if (!latest || new Date(createdAt) > new Date(latest.createdAt)) {
      return { file, createdAt };
    }
    return latest;
  }, null);

// Extract season directory name (e.g., "tags/seasons/systems/index.md" -> "systems")
const seasonName = latestSeason.file.path.split('/').slice(-2)[0];
const seasonTag = `seasons/${seasonName}`;

// Calculate day number within season
const daysSinceSeason = moment().diff(moment(latestSeason.createdAt), 'days', true);
const dayNumber = Math.ceil(daysSinceSeason);

// Build title with capitalized season name
const seasonTitle = seasonName.charAt(0).toUpperCase() + seasonName.slice(1);
const title = `${seasonTitle}: Day ${dayNumber}`;

// Find most recent daily note before today
const today = tp.date.now("YYYY-MM-DD");
const previousNote = app.vault.getMarkdownFiles()
  .filter(file => {
    if (!file.path.startsWith(DAILY_NOTES_FOLDER)) return false;
    // Match YYYY-MM-DD pattern and ensure it's before today
    return file.basename.match(/^\d{4}-\d{2}-\d{2}$/) && file.basename < today;
  })
  .sort((a, b) => b.basename.localeCompare(a.basename))[0];

const previousLink = previousNote ? previousNote.basename : tp.date.now("YYYY-MM-DD", -1);

-%>---
title: "<% title %>"
date: <% tp.date.now() %>
tags:
  - <% seasonTag %>
draft: false
---

⇐ [[notes/periodic/daily/<% previousLink %>]]

## Up Front

Today:

- 

## In Review

In review:

- 
