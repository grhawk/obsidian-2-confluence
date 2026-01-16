# Obsidian to Confluence

Sync the active Obsidian note to Confluence using the REST API. The plugin converts Obsidian-flavored Markdown to HTML (Confluence storage format) and updates or creates pages in your target space.

## Features
- Convert Markdown to Confluence storage HTML.
- Update existing pages by frontmatter page ID or by title lookup.
- Create new pages under an optional parent page.
- Store Confluence page ID back into frontmatter.

## Setup
1. Install dependencies: `npm install`
2. Build the plugin: `npm run build`
3. Copy `main.js`, `manifest.json`, and `styles.css` to your vault plugin folder (e.g. `.obsidian/plugins/obsidian-2-confluence/`).
4. Enable the plugin in Obsidian.
5. Configure settings: base URL, space key, auth email, and API token.

## Usage
- Run the command: `Sync active note to Confluence`.
- The plugin will look for a frontmatter field (default `confluencePageId`) to update an existing page.
- If no page ID is found, it searches by title in the configured space and updates the first match.
- Otherwise, it creates a new page and stores the page ID in frontmatter.

## Notes
- Wiki links are converted to regular Markdown links (e.g. `[[Note|Alias]]` -> `[Alias](Note)`).
- Embedded files (`![[file]]`) are converted to plain text markers; attachments are not uploaded yet.
- Confluence base URL should include `/wiki` for Confluence Cloud (e.g. `https://your-domain.atlassian.net/wiki`).

## License
MIT
