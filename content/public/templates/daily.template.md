<%*
// Set folder you want to get latest file for here
const folder = "tags/seasons";

// Get frontmatter keys of interest
const createdAtKey = "date";
const titleKey = "title";

const latestFileInFolder = app.vault.getMarkdownFiles().reduce((acc, file) => {
  // Skip files not in folder
  if (!file.path.startsWith(folder)) {
    return acc;
  }

  // Get time file was created from frontmatter
  const createdAt = app.metadataCache.getFileCache(file)?.frontmatter?.[createdAtKey];
  const noteTitle = app.metadataCache.getFileCache(file)?.frontmatter?.[titleKey];

  // If file has created at frontmatter and if that file was created more recently than the currently found most recently created file, then set most recently created file to file
  if (
    createdAt &&
    (!acc || new Date(createdAt).getTime() > new Date(acc.createdAt).getTime()))
  {
    acc = { file, noteTitle, createdAt };
  }

  return acc;
}, null);

let latestFileSeasonTag = `seasons/${latestFileInFolder.file.basename}`

let startDate = moment(latestFileInFolder.createdAt);
let now = moment();

let days = now.diff(startDate, 'days', true);
let roundedDays = Math.ceil(days);

let sanitizedTag = latestFileInFolder.file.basename
sanitizedTag = sanitizedTag.charAt(0).toUpperCase() + sanitizedTag.slice(1)
let title = `${sanitizedTag}: Day ${roundedDays}`

-%>---
title: "<% title %>"
date: <% tp.date.now() %>
tags:
  - <% latestFileSeasonTag %>
  - notes/daily
draft: false
---

⇐ [[writing/notes/!periodic/dailies/<% tp.date.now("YYYY-MM-DD", -1) %>]] | [[writing/notes/!periodic/dailies/<% tp.date.now("YYYY-MM-DD", +1) %>]] ⇒

```dataview
TASK
WHERE !completed
  AND typeof(due) = "date"
  AND due <= date("<% tp.date.now() %>") + dur(2 days)
SORT date ASC
GROUP BY file.link
```

## Today's Plan



## Today's Report

> To have the full intended experience, please listen to the [Pikmin 2 "Today's Report" theme](https://www.youtube.com/watch?v=l1fCmKZnq3U&list=PLwyW5mbdZMGN8mGTqvDhsBs37SW4TkHcw&index=85) while reading

N/A

[^1]: [[public/content/notes/caveat-lector|caveat lector]] — This is a daily note! I don't actively maintain any information in daily notes, so please be cautious in following any advice here.
