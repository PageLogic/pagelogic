import fs from "fs";
import path from "path";

export interface PageMapFile {
  name: string,
  path: string
}

export interface PageMapDir extends PageMapFile {
  children: Array<PageMapFile | PageMapDir>
}

export class PageMap {
  protected rootPath: string;
  protected root?: PageMapDir;
  protected updating = false;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async get(): Promise<PageMapDir> {
    if (!this.root) {
      this.updating = true;
      this.root = {
        name: '.',
        path: '.',
        children: []
      }
      try {
        await this.update();
        this.updating = false;
      } catch (ignored) {}
    }
    return this.root;
  }

  clear(): this {
    delete this.root;
    return this;
  }

  protected async update() {
    const f = async (p: PageMapDir) => {
      const dirpath = path.join(this.rootPath, p.path);
      const list = await fs.promises.readdir(dirpath);
      for (const file of list) {
        const relpath = path.join(p.path, file);
        const abspath = path.join(this.rootPath, relpath);
        const stat = await fs.promises.stat(abspath);
        if (stat.isDirectory()) {
          const item = { name: file, path: relpath, children: [] };
          p.children.push(item);
          await f(item);
        } else if (file.endsWith('.html')) {
          p.children.push({ name: file, path: relpath });
        }
      }
    }
    await f(this.root!);
  }
}
