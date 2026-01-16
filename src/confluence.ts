import { requestUrl } from "obsidian";
import { ConfluenceSettings } from "./settings";

export interface ConfluencePage {
  id: string;
  title: string;
  version?: {
    number: number;
  };
}

interface ConfluenceSearchResult {
  results: ConfluencePage[];
}

interface ConfluencePageResponse extends ConfluencePage {
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
  };
}

export class ConfluenceClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(private settings: ConfluenceSettings) {
    this.baseUrl = settings.baseUrl.replace(/\/$/, "");
    this.authHeader = this.buildAuthHeader(
      settings.authEmail,
      settings.apiToken
    );
  }

  async findPageByTitle(
    spaceKey: string,
    title: string
  ): Promise<ConfluencePage | null> {
    const data = await this.request<ConfluenceSearchResult>("content", {
      query: {
        title,
        spaceKey,
        expand: "version"
      }
    });

    return data.results.length ? data.results[0] : null;
  }

  async getPageById(id: string): Promise<ConfluencePage> {
    return this.request<ConfluencePage>(`content/${id}`, {
      query: {
        expand: "version"
      }
    });
  }

  async createPage(
    spaceKey: string,
    title: string,
    body: string,
    parentPageId?: string
  ): Promise<ConfluencePage> {
    const payload: Record<string, unknown> = {
      type: "page",
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: body,
          representation: "storage"
        }
      }
    };

    if (parentPageId) {
      payload.ancestors = [{ id: parentPageId }];
    }

    return this.request<ConfluencePage>("content", {
      method: "POST",
      body: payload
    });
  }

  async updatePageById(
    id: string,
    title: string,
    body: string
  ): Promise<ConfluencePage> {
    const current = await this.getPageById(id);
    const versionNumber = current.version?.number ?? 1;

    const payload = {
      id,
      type: "page",
      title,
      version: {
        number: versionNumber + 1
      },
      body: {
        storage: {
          value: body,
          representation: "storage"
        }
      }
    };

    return this.request<ConfluencePage>(`content/${id}`, {
      method: "PUT",
      body: payload
    });
  }

  private buildAuthHeader(email: string, token: string): string {
    const raw = `${email}:${token}`;
    const encoded = typeof btoa === "function" ? btoa(raw) : raw;
    if (encoded === raw) {
      throw new Error("Base64 encoding is not available in this environment.");
    }
    return `Basic ${encoded}`;
  }

  private buildUrl(path: string, query?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}/rest/api/${path}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }

  private async request<T>(
    path: string,
    options?: {
      method?: string;
      body?: Record<string, unknown>;
      query?: Record<string, string>;
    }
  ): Promise<T> {
    const url = this.buildUrl(path, options?.query);
    const method = options?.method ?? "GET";
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: "application/json"
    };

    let body: string | undefined;
    if (options?.body) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await requestUrl({
      url,
      method,
      headers,
      body
    });

    if (response.status < 200 || response.status >= 300) {
      const detail = response.text || "Unknown error";
      throw new Error(`Confluence API error ${response.status}: ${detail}`);
    }

    return response.json as T;
  }
}
