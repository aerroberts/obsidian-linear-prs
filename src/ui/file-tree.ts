import { createIcon } from './elements';
import { buildFileTree, type FileTreeNode, type ReviewFileEntry } from '../file-tree';

export function renderFileTree(parent: HTMLElement, files: ReviewFileEntry[]) {
  const folders: { path: string; element: HTMLDetailsElement }[] = [];
  const buttons: { entry: ReviewFileEntry; element: HTMLButtonElement }[] = [];
  const render = (nodes: FileTreeNode[], container: HTMLElement) => {
    for (let node of nodes) {
      if (node.file) {
        const entry = node.file;
        const button = container.createEl('button', {
          cls: 'linear-prs-diff-file-link',
          attr: { title: entry.filename, type: 'button' },
        });
        createIcon(button, 'file-code');
        button.createSpan({ text: node.name });
        button.onclick = () => {
          buttons.forEach(({ element }) => {
            element.removeClass('is-current');
            element.removeAttribute('aria-current');
          });
          button.addClass('is-current');
          button.setAttr('aria-current', 'true');
          entry.select();
        };
        buttons.push({ entry, element: button });
        continue;
      }
      let name = node.name;
      // Compact unbranched directory paths, retaining folders wherever they branch.
      while (node.children.length === 1 && !node.children[0].file) {
        node = node.children[0];
        name += `/${node.name}`;
      }
      const folder = container.createEl('details', {
        cls: 'linear-prs-diff-folder',
        attr: { open: '' },
      });
      const summary = folder.createEl('summary', { attr: { title: node.path } });
      createIcon(summary, 'chevron-down', undefined, 'linear-prs-chevron');
      createIcon(summary, 'folder');
      summary.createSpan({ text: name });
      folders.push({ path: node.path, element: folder });
      render(node.children, folder.createDiv({ cls: 'linear-prs-diff-folder-children' }));
    }
  };
  render(buildFileTree(files), parent);
  const collapsed = new Set<string>();
  let filtering = false;
  return (query: string) => {
    const search = query.trim().toLowerCase();
    if (search && !filtering) {
      collapsed.clear();
      folders
        .filter((folder) => !folder.element.open)
        .forEach((folder) => collapsed.add(folder.path));
    }
    buttons.forEach(({ entry, element }) => {
      element.hidden = !entry.filename.toLowerCase().includes(search);
    });
    for (const folder of folders) {
      folder.element.hidden = !buttons.some(
        ({ entry, element }) =>
          !element.hidden && entry.filename.startsWith(`${folder.path}/`),
      );
      if (search) {
        folder.element.open = true;
      } else if (filtering) {
        folder.element.open = !collapsed.has(folder.path);
      }
    }
    filtering = !!search;
  };
}
