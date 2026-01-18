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
3. Copy `main.js`, `manifest.json`, and `styles.css` to your vault plugin folder (e.g. `.obsidian/plugins/confluence-publisher/`).
4. Enable the plugin in Obsidian.
5. Configure settings: base URL, space key, auth email, and API token.

## Usage
- Run the command: `Sync active note to Confluence`.
- The plugin will look for a frontmatter field (default `confluencePageId`) to update an existing page.
- If no page ID is found, it searches by title in the configured space and updates the first match.
- Otherwise, it creates a new page and stores the page ID in frontmatter.

## Syncing a Page
1. Open the note you want to sync.
2. Open the Command Palette and run `Sync active note to Confluence`.
3. On success, the plugin writes the Confluence page ID back to frontmatter.

## Getting Confluence Details
### Space key
- From URL: `https://your-domain.atlassian.net/wiki/spaces/ENG/overview` -> space key is `ENG`.
- From Space settings: Overview/Details lists the space key.

### API token (Confluence Cloud)
1. Visit `https://id.atlassian.com/manage-profile/security/api-tokens`.
2. Click "Create API token", name it, and copy the token.
3. Use your Atlassian account email + this token in the plugin settings.

### Parent page ID
- From URL: `.../wiki/spaces/SPACE/pages/123456789/Page+Title` -> page ID is `123456789`.
- From API: `GET .../wiki/rest/api/content?title=Page%20Title&spaceKey=SPACE` and read `results[0].id`.

## Notes
- Wiki links are converted to Confluence URLs when possible (via frontmatter page ID or title match). Unresolved wiki links are left as `[[...]]`.
- Non-image embeds (`![[file]]`) are converted to plain text markers; attachments other than images are not uploaded yet.
- Image embeds (`![[image.png]]`) and Markdown image links to local files are uploaded as Confluence attachments and embedded in the page.
- Confluence base URL should include `/wiki` for Confluence Cloud (e.g. `https://your-domain.atlassian.net/wiki`).

## Troubleshooting
- 404 errors usually mean the base URL is wrong or the page ID/space key is invalid. The base URL should be the site root (include `/wiki` for Cloud) and must not include `/rest/api`.
- If you set `confluencePageId`, make sure the page exists and you have access; otherwise remove it to force create.

## Community Plugin Release Checklist
1. Update `manifest.json` version and `package.json` version to match the release tag (e.g. `0.1.1`).
2. Run `npm run build` and verify `main.js` is generated.
3. Create a GitHub release tagged `vX.Y.Z` and upload `main.js`, `manifest.json`, and `styles.css` as assets.
4. Submit a PR to `obsidianmd/obsidian-releases` updating `community-plugins.json` with this plugin entry.

## License
MIT
