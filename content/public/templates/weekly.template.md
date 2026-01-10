<%*
// Configuration
const SEASONS_FOLDER = "tags/seasons";

// Find the most recent season by date
const latestSeason = app.vault.getMarkdownFiles()
  .filter(file => file.path.startsWith(SEASONS_FOLDER))
  .reduce((latest, file) => {
    const createdAt = app.metadataCache.getFileCache(file)?.frontmatter?.date;
    const noteTitle = app.metadataCache.getFileCache(file)?.frontmatter?.title;
    if (!createdAt) return latest;
    
    if (!latest || new Date(createdAt) > new Date(latest.createdAt)) {
      return { file, noteTitle, createdAt };
    }
    return latest;
  }, null);

// Extract season directory name (e.g., "tags/horticulture/seasons/systems/index.md" -> "systems")
const seasonName = latestSeason.file.path.split('/').slice(-2)[0];
const seasonTag = `seasons/${seasonName}`;

// Calculate week number within season
const weeksSinceSeason = moment().diff(moment(latestSeason.createdAt), 'weeks', true);
const weekNumber = Math.ceil(weeksSinceSeason);

// Build title
const title = `${latestSeason.noteTitle}: Week ${weekNumber}`;

-%>---
title: "<% title %>"
date: <% tp.date.now() %>
tags:
  - <% seasonTag %>
  - notes/weekly
---
## Up & Coming

TODO

### Projects

TODO

## Tasks

### Due

```dataview
TASK
WHERE !completed
  AND typeof(due) = "date"
  AND due <= date("<% tp.date.now() %>") + dur(7 days)
SORT date ASC
GROUP BY file.link
```

### Done

```dataview
TASK
WHERE typeof(completion) = "date"
  AND completion >= date("<% tp.date.now() %>")
  AND completion < date("<% tp.date.now() %>") + dur(7 days)
SORT date DESC
GROUP BY file.link
```

## Hindsight

TODO
