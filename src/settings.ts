import { App, PluginSettingTab, Setting } from "obsidian";
import ObsidianToConfluencePlugin from "./main";

export interface ConfluenceSettings {
  baseUrl: string;
  spaceKey: string;
  authEmail: string;
  apiToken: string;
  parentPageId: string;
  pageIdFrontmatterKey: string;
  convertWikiLinks: boolean;
}

export const DEFAULT_SETTINGS: ConfluenceSettings = {
  baseUrl: "",
  spaceKey: "",
  authEmail: "",
  apiToken: "",
  parentPageId: "",
  pageIdFrontmatterKey: "confluencePageId",
  convertWikiLinks: true
};

export class ConfluenceSettingTab extends PluginSettingTab {
  plugin: ObsidianToConfluencePlugin;

  constructor(app: App, plugin: ObsidianToConfluencePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Confluence base URL")
      .setDesc("Example: https://your-domain.atlassian.net/wiki")
      .addText((text) =>
        text
          .setPlaceholder("https://your-domain.atlassian.net/wiki")
          .setValue(this.plugin.settings.baseUrl)
          .onChange(async (value) => {
            this.plugin.settings.baseUrl = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Space key")
      .setDesc("Confluence space key for new pages.")
      .addText((text) =>
        text
          .setPlaceholder("DOCS")
          .setValue(this.plugin.settings.spaceKey)
          .onChange(async (value) => {
            this.plugin.settings.spaceKey = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auth email")
      .setDesc("Email address used with your Confluence API token.")
      .addText((text) =>
        text
          .setPlaceholder("you@example.com")
          .setValue(this.plugin.settings.authEmail)
          .onChange(async (value) => {
            this.plugin.settings.authEmail = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("API token")
      .setDesc("API token for Confluence (stored locally).")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("••••••••")
          .setValue(this.plugin.settings.apiToken)
          .onChange(async (value) => {
            this.plugin.settings.apiToken = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Parent page ID")
      .setDesc("Optional parent page ID for newly created pages.")
      .addText((text) =>
        text
          .setPlaceholder("123456789")
          .setValue(this.plugin.settings.parentPageId)
          .onChange(async (value) => {
            this.plugin.settings.parentPageId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Frontmatter key for page ID")
      .setDesc("Frontmatter field to store the Confluence page ID.")
      .addText((text) =>
        text
          .setPlaceholder("confluencePageId")
          .setValue(this.plugin.settings.pageIdFrontmatterKey)
          .onChange(async (value) => {
            this.plugin.settings.pageIdFrontmatterKey = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Convert wiki links")
      .setDesc("Convert Obsidian wiki links to standard Markdown links.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.convertWikiLinks)
          .onChange(async (value) => {
            this.plugin.settings.convertWikiLinks = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
