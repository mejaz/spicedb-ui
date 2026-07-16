export function parseSchema(schema = '') {
  const definitions = [];
  const pattern = /\bdefinition\s+([A-Za-z_][\w/]*)\s*\{/g;
  let match;

  while ((match = pattern.exec(schema)) !== null) {
    const openBrace = pattern.lastIndex - 1;
    const closeBrace = matchingBrace(schema, openBrace);
    if (closeBrace === -1) continue;
    const block = schema.slice(openBrace + 1, closeBrace);
    definitions.push({
      name: match[1],
      relations: collect(block, /\brelation\s+([A-Za-z_]\w*)\s*:\s*([^\n\r]+)/g, 'type'),
      permissions: collect(block, /\bpermission\s+([A-Za-z_]\w*)\s*=\s*([^\n\r]+)/g, 'expression'),
    });
    pattern.lastIndex = closeBrace + 1;
  }

  return definitions;
}

export function validateSchemaText(schema) {
  if (typeof schema !== 'string' || !schema.trim()) return ['Schema cannot be empty'];
  const errors = [];
  let depth = 0;
  for (const character of stripComments(schema)) {
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (depth < 0) {
      errors.push('Schema contains an unexpected closing brace');
      break;
    }
  }
  if (depth !== 0) errors.push('Schema contains unbalanced braces');
  if (parseSchema(schema).length === 0) errors.push('Schema must contain at least one definition');
  return [...new Set(errors)];
}

function matchingBrace(text, start) {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function collect(block, pattern, valueKey) {
  const values = [];
  let match;
  while ((match = pattern.exec(block)) !== null) {
    values.push({ name: match[1], [valueKey]: match[2].trim() });
  }
  return values;
}

function stripComments(schema) {
  return schema.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}
