// Extraction par AST (espree + JSX) : littéraux affichables, avec leur contexte.
import * as espree from 'espree';
import fs from 'node:fs';
const [,, root, dictPath, ...files] = process.argv;
const d = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const known = new Set([...Object.keys(d), ...Object.values(d)]);
const FR = /[éèêàçùûôîÉ’«»…]/;
const SKIP_ATTR = new Set(['className','class','value','name','id','type','href','to','src','key','htmlFor','rel','target','role','style','accept','method','action','autoComplete','inputMode','lang','dir','for','viewBox','d','fill','stroke','xmlns']);
const SKIP_KEYS = new Set(['status','role','type','value','id','key','path','href','to','color','icon','variant','size','mode','action','table','column','field','sort','order','format','lang','language','code','className','bg','text','border','model','voice','voice_id','url','method','content_type','activity_type','nomination_status','sender','channel','kind','src','quickAction','tab','step','view','filter','level','category','position','align']);
const displayable = (t) => {
  const s = t.trim();
  if (s.length < 2 || FR.test(s) || known.has(s)) return false;
  if (/^[\d\s.,%:/()+\-–—]+$/.test(s)) return false;
  if (/^[a-z_][a-z0-9_]*$/.test(s) || /^[A-Z_][A-Z0-9_]+$/.test(s)) return false; // identifiants
  if (/^[a-z-]+:[a-z]/.test(s) || /https?:|^\/|\.(jsx?|png|svg|pdf|mp3|json)$|=eq\.|\.eq\.|select=|order=|^#|@/.test(s)) return false;
  if (/\b(bg|text|border|px|py|w|h|rounded|flex|grid|hover|font|items|justify|gap|mt|mb|ml|mr|pl|pr|pt|pb|space|max|min|shadow|from|to|via|ring|focus|absolute|relative|fixed|sticky|inset|z|opacity|transition|animate|divide|overflow|cursor|leading|tracking|truncate|whitespace|object|top|bottom|left|right|translate|scale|group|peer|block|inline|hidden|uppercase|lowercase|capitalize|underline|col|row|self|place|order|resize|outline|appearance|backdrop|blur|line|break|list|decoration)-[a-z0-9\[\]\/.%#-]/.test(s)) return false;
  if (!/[A-Za-z]{2,}/.test(s)) return false;
  if (!s.includes(' ') && !/^[A-Z]/.test(s) && !/[!?.…:]$/.test(s)) return false;
  return true;
};
const out = {};
for (const f of files) {
  const code = fs.readFileSync(`${root}/${f}`, 'utf8');
  let ast;
  try { ast = espree.parse(code, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }, range: true }); }
  catch (e) { console.error('PARSE FAIL', f, e.message); continue; }
  const found = new Map(); // text -> contexts
  const add = (t, ctx) => { const s = t.replace(/\s+/g, ' ').trim(); if (!displayable(s)) return; if (!found.has(s)) found.set(s, new Set()); found.get(s).add(ctx); };
  const walk = (node, parent) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'JSXText') add(node.value, 'jsxtext');
    else if (node.type === 'Literal' && typeof node.value === 'string') {
      let ctx = 'literal';
      if (parent) {
        if (parent.type === 'BinaryExpression' && /==|!=/.test(parent.operator)) ctx = 'compare';
        else if (parent.type === 'SwitchCase') ctx = 'compare';
        else if (parent.type === 'Property' && parent.key === node) ctx = 'compare';
        else if (parent.type === 'Property' && SKIP_KEYS.has(parent.key?.name)) ctx = 'data';
        else if (parent.type === 'JSXAttribute') ctx = SKIP_ATTR.has(parent.name?.name) ? 'data' : 'attr';
        else if (parent.type === 'ImportDeclaration' || parent.type === 'MemberExpression' || parent.type === 'CallExpression' && parent.callee?.property?.name?.match(/^(from|eq|in|order|select|includes|startsWith|endsWith|split|replace|indexOf|getItem|setItem|removeItem|querySelector|getElementById|createElement|addEventListener|removeEventListener)$/)) ctx = 'data';
        else if (parent.type === 'ArrayExpression') ctx = 'array';
      }
      add(node.value, ctx);
    } else if (node.type === 'TemplateLiteral') {
      for (const q of node.quasis) if (q.value.cooked && q.value.cooked.trim().split(' ').length >= 2) add(q.value.cooked, 'template');
    }
    for (const k of Object.keys(node)) {
      if (k === 'parent' || k === 'range' || k === 'loc') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, node));
      else if (v && typeof v.type === 'string') walk(v, node);
    }
  };
  walk(ast, null);
  const keep = [...found.entries()].filter(([, ctx]) => !ctx.has('compare') && !ctx.has('data')).map(([t]) => t).sort();
  if (keep.length) { out[f] = keep; console.log(`## ${f} (${keep.length})`); console.log(keep.join(' | ')); }
}
fs.writeFileSync(dictPath.replace('fr.json', 'todo_ast.json'), JSON.stringify(out, null, 0));
console.log('total', Object.values(out).reduce((a, b) => a + b.length, 0));
