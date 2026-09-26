const PROTECTED_PATTERNS = [
  /```[\s\S]*?```/g,
  /`[^`\n]+`/g,
  /!\[[^\]]*\]\([^\)]*\)/g,
  /\[[^\]]+\]\([^\)]*\)/g,
  /\{[^{}\n]*\}/g,
  /<([A-Z][\w.]*)\b[^>]*\/>/g,
  /<([A-Z][\w.]*)\b[^>]*>[\s\S]*?<\/\1>/g,
];

function protectMarkdown(content) {
  const protectedBlocks = [];
  let output = content;

  for (const pattern of PROTECTED_PATTERNS) {
    output = output.replace(pattern, (match) => {
      const token = `__NEXT_TRANSLATE_TOKEN_${protectedBlocks.length}__`;
      protectedBlocks.push(match);
      return token;
    });
  }

  return { output, protectedBlocks };
}

function restoreMarkdown(content, protectedBlocks) {
  return protectedBlocks.reduce(
    (acc, block, idx) => acc.replace(new RegExp(`__NEXT_TRANSLATE_TOKEN_${idx}__`, 'g'), block),
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
