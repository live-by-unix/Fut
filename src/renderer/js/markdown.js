'use strict';

/**
 * Configures markdown-it with Prism-powered syntax highlighting and exposes a
 * single `FutMarkdown.render(text)` helper on the global namespace. Kept free of
 * DOM/IPC concerns so it is easy to reason about and reuse.
 */
(function initMarkdown(global) {
  const Prism = global.Prism;
  const markdownit = global.markdownit;

  if (!markdownit) {
    throw new Error('markdown-it failed to load.');
  }

  function highlight(code, lang) {
    if (Prism && lang && Prism.languages[lang]) {
      try {
        return Prism.highlight(code, Prism.languages[lang], lang);
      } catch (err) {
        // fall through to no highlighting
      }
    }
    return '';
  }

  const md = markdownit({
    html: false,
    linkify: true,
    typographer: true,
    breaks: false,
    highlight(code, lang) {
      const language = (lang || '').trim().toLowerCase();
      const highlighted = highlight(code, language);
      const cls = language ? ` class="language-${language}"` : '';
      if (highlighted) {
        return `<pre class="code-block"><code${cls}>${highlighted}</code></pre>`;
      }
      return `<pre class="code-block"><code${cls}>${md.utils.escapeHtml(code)}</code></pre>`;
    }
  });

  // Render tables with a wrapper for horizontal scroll on small panes.
  const defaultTableOpen = md.renderer.rules.table_open ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.table_open = function tableOpen(tokens, idx, options, env, self) {
    return '<div class="table-wrap">' + defaultTableOpen(tokens, idx, options, env, self);
  };
  const defaultTableClose = md.renderer.rules.table_close ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.table_close = function tableClose(tokens, idx, options, env, self) {
    return defaultTableClose(tokens, idx, options, env, self) + '</div>';
  };

  // Force external links to open safely (renderer denies in-app navigation).
  const defaultLinkOpen = md.renderer.rules.link_open ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = function linkOpen(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const href = token.attrGet('href') || '';
    if (/^https?:\/\//i.test(href)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noopener noreferrer');
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  global.FutMarkdown = {
    render(text) {
      return md.render(text || '');
    }
  };
})(window);
