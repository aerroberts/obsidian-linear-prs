export interface ReviewFileEntry {
  filename: string;
  select: () => void;
}

export interface FileTreeNode {
  name: string;
  path: string;
  file?: ReviewFileEntry;
  children: FileTreeNode[];
}

export function buildFileTree(files: ReviewFileEntry[]): FileTreeNode[] {
  const root: FileTreeNode = { name: '', path: '', children: [] };
  for (const file of files) {
    let parent = root;
    const parts = file.filename.split('/');
    parts.forEach((name, index) => {
      const path = parts.slice(0, index + 1).join('/');
      let child = parent.children.find((node) => node.path === path);
      if (!child) {
        child = { name, path, children: [] };
        parent.children.push(child);
      }
      if (index === parts.length - 1) {
        child.file = file;
      }
      parent = child;
    });
  }
  const sort = (nodes: FileTreeNode[]) => {
    nodes.sort(
      (left, right) =>
        Number(!!left.file) - Number(!!right.file) || left.name.localeCompare(right.name),
    );
    nodes.forEach((node) => sort(node.children));
  };
  sort(root.children);
  return root.children;
}
