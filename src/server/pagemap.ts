import fs from "fs";
import path from "path";
import PQueue from 'p-queue';

// export interface PageMapFile {
//   name: string,
//   path: string
// }

// export interface PageMapDir extends PageMapFile {
//   children: Array<PageMapFile | PageMapDir>
// }

// export type PageMapItem = PageMapDir | PageMapFile;

export interface PageMapItem {
  type: "dir" | "page",
  name: string
}

export interface PageMapDir extends PageMapItem {
  type: "dir"
}

export interface PageMapPage extends PageMapItem {
  type: "page"
}

export type PageMapData = { [key: string]: PageMapItem };

export class PageMap {
  protected rootPath: string;
  protected map?: PageMapData;
  protected queue = new PQueue({concurrency: 1});

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async get(): Promise<PageMapData> {
    const f = async () => {
      if (!this.map) {
        this.map = {
          "": { type: "dir", name: ""}
        };
        await this.update();
      }
    }
    // enqueue concurrent calls
    await this.queue.add(f);
    return this.map!;
  }

  clear(): this {
    delete this.map;
    return this;
  }

  async getItem(pathname: string): Promise<PageMapItem | undefined> {
    if (pathname.startsWith('/')) {
      pathname = pathname.substring(1);
    }
    if (pathname.endsWith('/')) {
      pathname = pathname.substring(0, pathname.length - 1);
    }
    const map = await this.get();
    return map[pathname];
  }

  isDirectory(item: PageMapItem): boolean {
    return Reflect.has(item, 'children');
  }

  isPage(item: PageMapItem): boolean {
    return !Reflect.has(item, 'children');
  }

  protected async update() {
    const f = async (p: PageMapItem, ppath: string) => {
      const dirpath = path.join(this.rootPath, ppath);
      const list = await fs.promises.readdir(dirpath);
      for (const file of list) {
        const relpath = path.join(ppath, file);
        const abspath = path.join(this.rootPath, relpath);
        const stat = await fs.promises.stat(abspath);
        if (stat.isDirectory()) {
          const item: PageMapDir = { type: "dir", name: file };
          this.map![relpath] = item;
          await f(item, relpath);
        } else if (file.endsWith('.html')) {
          const item: PageMapPage = { type: "page", name: file };
          this.map![relpath] = item;
        }
      }
    }
    await f(this.map!["."], '.');
  }
}
