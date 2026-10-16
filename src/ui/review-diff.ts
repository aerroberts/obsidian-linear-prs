import { parse } from 'diff2html';
import { Diff2HtmlUI } from 'diff2html/lib/ui/js/diff2html-ui-base';
import type { OutputFormatType } from 'diff2html/lib/types';
import { renderFileTree } from './file-tree';
import { ColorSchemeType } from 'diff2html/lib/types';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import yaml from 'highlight.js/lib/languages/yaml';
import sql from 'highlight.js/lib/languages/sql';
import plaintext from 'highlight.js/lib/languages/plaintext';
import { createIcon, createIconButton } from './elements';

for (const [name, language] of Object.entries({
  typescript,
  javascript,
  json,
  css,
  xml,
  python,
  bash,
  yaml,
  sql,
  plaintext,
})) {
  hljs.registerLanguage(name, language);
}

export function renderReviewDiff(parent: HTMLElement, diff: string) {
  const files = parse(diff);
  const toolbar = parent.createDiv({ cls: 'linear-prs-diff-toolbar' });
  toolbar.createEl('h3', { text: `Files changed · ${files.length}` });
  toolbar.createSpan({
    cls: 'linear-prs-diff-added',
    text: `+${files.reduce((total, file) => total + file.addedLines, 0)}`,
  });
  toolbar.createSpan({
    cls: 'linear-prs-diff-deleted',
    text: `−${files.reduce((total, file) => total + file.deletedLines, 0)}`,
  });
  let outputFormat: OutputFormatType = 'side-by-side';
  const modes = toolbar.createDiv({
    cls: 'linear-prs-control-set linear-prs-diff-modes',
    attr: { role: 'group', 'aria-label': 'Diff layout' },
  });
  if (!files.length) {
    parent.createDiv({
      cls: 'linear-prs-empty',
      text: 'No changes in this pull request.',
    });
    return;
  }
  const layout = parent.createDiv({ cls: 'linear-prs-diff-layout' });
  const navigation = layout.createEl('nav', {
    cls: 'linear-prs-diff-files',
    attr: { 'aria-label': 'Changed files' },
  });
  const filter = navigation.createEl('input', {
    cls: 'linear-prs-search',
    attr: {
      placeholder: 'Filter files…',
      'aria-label': 'Filter changed files',
      type: 'search',
    },
  });
  const links = navigation.createDiv();
  const changes = layout.createDiv({ cls: 'linear-prs-diff-changes' });
  const entries = files.map((file) => {
    const filename = file.isDeleted ? file.oldName : file.newName;
    const card = changes.createEl('details', {
      cls: 'linear-prs-diff-file',
      attr: { open: '' },
    });
    const header = card.createEl('summary', { cls: 'linear-prs-group-header' });
    createIcon(header, 'chevron-down', undefined, 'linear-prs-chevron');
    header.createSpan({
      cls: 'linear-prs-diff-filename',
      text: filename,
      attr: { title: filename },
    });
    const status = file.isBinary
      ? 'Binary'
      : file.isRename
        ? 'Renamed'
        : file.isNew
          ? 'Added'
          : file.isDeleted
            ? 'Deleted'
            : 'Modified';
    header.createSpan({ cls: 'linear-prs-count', text: status });
    header.createSpan({ cls: 'linear-prs-diff-added', text: `+${file.addedLines}` });
    header.createSpan({ cls: 'linear-prs-diff-deleted', text: `−${file.deletedLines}` });
    const content = card.createDiv({ cls: 'linear-prs-diff-editor' });
    let renderedFormat: OutputFormatType | undefined;
    const render = () => {
      if (renderedFormat === outputFormat) {
        return;
      }
      renderedFormat = outputFormat;
      content.empty();
      if (file.isBinary || !file.blocks.length) {
        content.createDiv({
          cls: 'linear-prs-empty',
          text: file.isBinary
            ? 'Binary file changed. No text diff is available.'
            : 'File renamed or permissions changed; no text changes.',
        });
        return;
      }
      new Diff2HtmlUI(
        content,
        [file],
        {
          outputFormat,
          drawFileList: false,
          matching: 'lines',
          colorScheme: ColorSchemeType.LIGHT,
          stickyFileHeaders: false,
          fileContentToggle: false,
          fileListToggle: false,
          highlightLanguages: new Map([
            ['tsx', 'typescript'],
            ['jsx', 'javascript'],
          ]),
        },
        hljs,
      ).draw();
    };
    // Defer offscreen files so large PRs do not block the window while opening.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          render();
          observer.disconnect();
        }
      },
      { root: parent.closest('.linear-prs-diff-scroll'), rootMargin: '400px' },
    );
    observer.observe(card);
    return {
      filename,
      card,
      observer,
      select: () => {
        card.open = true;
        render();
        card.scrollIntoView({ block: 'start' });
      },
      changeMode: () => {
        if (renderedFormat) {
          render();
        }
      },
    };
  });
  const filterTree = renderFileTree(links, entries);
  const modeButtons = new Map<OutputFormatType, HTMLButtonElement>();
  for (const [format, label] of [
    ['line-by-line', 'Unified'],
    ['side-by-side', 'Split'],
  ] as const) {
    const button = modes.createEl('button', {
      text: label,
      cls: 'linear-prs-diff-mode',
      attr: {
        type: 'button',
        'aria-label': `${label} diff`,
        'aria-pressed': String(format === outputFormat),
      },
    });
    button.toggleClass('is-active', format === outputFormat);
    modeButtons.set(format, button);
    button.onclick = () => {
      if (outputFormat === format) {
        return;
      }
      outputFormat = format;
      modeButtons.forEach((modeButton, mode) => {
        modeButton.toggleClass('is-active', mode === format);
        modeButton.setAttr('aria-pressed', String(mode === format));
      });
      entries.forEach((entry) => entry.changeMode());
    };
  }
  filter.oninput = () => {
    filterTree(filter.value);
    for (const entry of entries) {
      const matches = entry.filename.toLowerCase().includes(filter.value.toLowerCase());
      entry.card.hidden = !matches;
    }
  };
  createIconButton(toolbar, 'Collapse all files', 'fold-vertical', () =>
    entries.forEach((entry) => {
      entry.card.open = false;
    }),
  );
  createIconButton(toolbar, 'Expand all files', 'unfold-vertical', () =>
    entries.forEach((entry) => {
      entry.card.open = true;
    }),
  );
  return () => entries.forEach((entry) => entry.observer.disconnect());
}
