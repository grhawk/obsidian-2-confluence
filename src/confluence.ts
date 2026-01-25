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

interface ConfluenceAttachment {
  id: string;
  title: string;
  version?: {
    number: number;
  };
}

interface ConfluenceAttachmentResult {
  results: ConfluenceAttachment[];
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

  getPageUrl(id: string): string {
    return `${this.baseUrl}/pages/viewpage.action?pageId=${encodeURIComponent(
      id
    )}`;
  }

  async findAttachmentByFilename(
    pageId: string,
    filename: string
  ): Promise<ConfluenceAttachment | null> {
    const data = await this.request<ConfluenceAttachmentResult>(
      `content/${pageId}/child/attachment`,
      {
        query: {
          filename,
          expand: "version"
        }
      }
    );

    return data.results.length ? data.results[0] : null;
  }

  async uploadAttachment(
    pageId: string,
    filename: string,
    data: ArrayBuffer
  ): Promise<void> {
    const existing = await this.findAttachmentByFilename(pageId, filename);
    const path = existing
      ? `content/${pageId}/child/attachment/${existing.id}/data`
      : `content/${pageId}/child/attachment`;
    const url = this.buildUrl(path);
    const { body, contentType } = this.buildMultipartBody(filename, data);
    const response = await this.postAttachment(
      url,
      body,
      contentType,
      "nocheck"
    );

    if (
      response.status === 403 &&
      (response.text || "").includes("XSRF check failed")
    ) {
      const retry = await this.postAttachment(
        url,
        body,
        contentType,
        "no-check"
      );
      if (retry.status >= 200 && retry.status < 300) {
        return;
      }

      const retryDetail = retry.text || "Unknown error";
      throw new Error(
        `Confluence attachment upload failed ${retry.status}: ${retryDetail}`
      );
    }

    if (response.status < 200 || response.status >= 300) {
      const detail = response.text || "Unknown error";
      throw new Error(
        `Confluence attachment upload failed ${response.status}: ${detail}`
      );
    }
  }

  private async postAttachment(
    url: string,
    body: ArrayBuffer,
    contentType: string,
    token: string
  ) {
    return requestUrl({
      url,
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        "Content-Type": contentType,
        "X-Atlassian-Token": token,
        "X-Requested-With": "XMLHttpRequest",
        Origin: this.baseUrl,
        Referer: `${this.baseUrl}/`
      },
      body,
      throw: false
    });
  }

  private buildMultipartBody(
    filename: string,
    data: ArrayBuffer
  ): { body: ArrayBuffer; contentType: string } {
    const boundary = `----obsidian-confluence-${Date.now().toString(16)}`;
    const mimeType = this.getMimeType(filename);
    const safeFilename = filename.replace(/"/g, "'");
    const header =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${safeFilename}"\r\n` +
      `Content-Type: ${mimeType}\r\n` +
      `\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;

    const encoder = new TextEncoder();
    const headerBytes = encoder.encode(header);
    const footerBytes = encoder.encode(footer);
    const dataBytes = new Uint8Array(data);

    const bodyBytes = new Uint8Array(
      headerBytes.length + dataBytes.length + footerBytes.length
    );
    bodyBytes.set(headerBytes, 0);
    bodyBytes.set(dataBytes, headerBytes.length);
    bodyBytes.set(footerBytes, headerBytes.length + dataBytes.length);

    return {
      body: bodyBytes.buffer,
      contentType: `multipart/form-data; boundary=${boundary}`
    };
  }

  private getMimeType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".svg")) return "image/svg+xml";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".bmp")) return "image/bmp";
    if (lower.endsWith(".tif") || lower.endsWith(".tiff"))
      return "image/tiff";
    return "application/octet-stream";
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
