function tokenFor(index) {
  return `__NEXT_TRANSLATE_TOKEN_${index}__`;
}

function isUppercaseLetter(char) {
  return Boolean(char) && char >= 'A' && char <= 'Z';
}

function findFencedCodeEnd(content, start) {
  const end = content.indexOf('```', start + 3);
  return end === -1 ? content.length : end + 3;
}

function findInlineCodeEnd(content, start) {
  const end = content.indexOf('`', start + 1);
  if (end === -1) {
    return -1;
  }
  const slice = content.slice(start + 1, end);
  if (slice.includes('\n')) {
    return -1;
  }
  return end + 1;
}

function findMarkdownLinkEnd(content, start) {
  const openOffset = content.startsWith('![', start) ? 2 : 1;
  const closeBracket = content.indexOf(']', start + openOffset);
  if (closeBracket === -1 || content[closeBracket + 1] !== '(') {
    return -1;
  }
  const closeParen = content.indexOf(')', closeBracket + 2);
  return closeParen === -1 ? -1 : closeParen + 1;
}

function findExpressionEnd(content, start) {
  const end = content.indexOf('}', start + 1);
  if (end === -1) {
    return -1;
  }
  const slice = content.slice(start + 1, end);
  if (slice.includes('\n')) {
    return -1;
  }
  return end + 1;
}

function findJsxEnd(content, start) {
  if (content[start] !== '<' || !isUppercaseLetter(content[start + 1])) {
    return -1;
  }
  const tagEnd = content.indexOf('>', start + 1);
  if (tagEnd === -1) {
    return -1;
  }

  const tagBody = content.slice(start + 1, tagEnd).trim();
  const nameMatch = tagBody.match(/^([A-Z][\w.]*)/);
  if (!nameMatch) {
    return -1;
  }

  if (tagBody.endsWith('/')) {
    return tagEnd + 1;
  }

  const closeTag = `</${nameMatch[1]}>`;
  const closeIndex = content.indexOf(closeTag, tagEnd + 1);
  if (closeIndex === -1) {
    return tagEnd + 1;
  }
  return closeIndex + closeTag.length;
}

function protectMarkdown(content) {
  const protectedBlocks = [];
  let output = '';
  let cursor = 0;

  while (cursor < content.length) {
    let end = -1;

    if (content.startsWith('```', cursor)) {
      end = findFencedCodeEnd(content, cursor);
    } else if (content[cursor] === '`') {
      end = findInlineCodeEnd(content, cursor);
    } else if (content.startsWith('![', cursor) || content[cursor] === '[') {
      end = findMarkdownLinkEnd(content, cursor);
    } else if (content[cursor] === '{') {
      end = findExpressionEnd(content, cursor);
    } else if (content[cursor] === '<') {
      end = findJsxEnd(content, cursor);
    }

    if (end > cursor) {
      const token = tokenFor(protectedBlocks.length);
      protectedBlocks.push(content.slice(cursor, end));
      output += token;
      cursor = end;
    } else {
      output += content[cursor];
      cursor += 1;
    }
  }

  return { output, protectedBlocks };
}

function restoreMarkdown(content, protectedBlocks) {
  return protectedBlocks.reduce(
    (acc, block, idx) => acc.split(tokenFor(idx)).join(block),
    content,
  );
}

async function translateProtectedMarkdown(content, translateFn) {
  const { output, protectedBlocks } = protectMarkdown(content);
  const translated = await translateFn(output);
  return restoreMarkdown(translated, protectedBlocks);
}

module.exports = {
  protectMarkdown,
  restoreMarkdown,
  translateProtectedMarkdown,
};
