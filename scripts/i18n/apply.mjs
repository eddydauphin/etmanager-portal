// Applique un dictionnaire EN -> FR aux littéraux affichables, via l'AST (espree + JSX).
// Ne touche jamais aux chaînes utilisées en comparaison, en clé d'objet, ni dans les
// attributs/clés de données (className, value, status, type...).
// Usage : node .i18n_apply.mjs <root> <dict.json> <fichiers...>
import * as espree from 'espree';
import fs from 'node:fs';

const [,, root, dictPath, ...files] = process.argv;
const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const SKIP_ATTR = new Set(['className','class','value','name','id','type','href','to','src','key','htmlFor','rel','target','role','style','accept','method','action','autoComplete','inputMode','lang','dir','for','viewBox','d','fill','stroke','xmlns']);
const SKIP_KEYS = new Set(['status','role','type','value','id','key','path','href','to','color','icon','variant','size','mode','action','table','column','field','sort','order','format','lang','language','code','className','bg','text','border','model','voice','voice_id','url','method','content_type','activity_type','nomination_status','sender','channel','kind','src','quickAction','tab','step','view','filter','level','category','position','align']);
const DATA_CALLS = /^(from|eq|in|order|select|includes|startsWith|endsWith|split|replace|indexOf|getItem|setItem|removeItem|querySelector|getElementById|createElement|addEventListener|removeEventListener)$/;

const quote = (s, q) => q + s.replace(/\\/g, '\\\\').replace(new RegExp(q, 'g'), '\\' + q).replace(/\n/g, '\\n') + q;

let total = 0;
for (const f of files) {
  const path = `${root}/${f}`;
  const code = fs.readFileSync(path, 'utf8');
  let ast;
  try { ast = espree.parse(code, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }, range: true }); }
  catch (e) { console.error('PARSE FAIL', f, e.message); continue; }
  const edits = [];
  const walk = (node, parent) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'JSXText') {
      const raw = node.value;
      const key = raw.replace(/\s+/g, ' ').trim();
      if (key && dict[key] !== undefined) {
        const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
        edits.push([node.range[0], node.range[1], lead + dict[key] + trail]);
      }
    } else if (node.type === 'Literal' && typeof node.value === 'string') {
      let skip = false;
      if (parent) {
        if (parent.type === 'BinaryExpression' && /==|!=/.test(parent.operator)) skip = true;
        else if (parent.type === 'SwitchCase') skip = true;
        else if (parent.type === 'Property' && parent.key === node) skip = true;
        else if (parent.type === 'Property' && SKIP_KEYS.has(parent.key?.name)) skip = true;
        else if (parent.type === 'JSXAttribute' && SKIP_ATTR.has(parent.name?.name)) skip = true;
        else if (parent.type === 'ImportDeclaration' || parent.type === 'MemberExpression') skip = true;
        else if (parent.type === 'CallExpression' && DATA_CALLS.test(parent.callee?.property?.name || '')) skip = true;
      }
      const key = node.value.replace(/\s+/g, ' ').trim();
      if (!skip && dict[key] !== undefined) {
        const q = code[node.range[0]];
        // conserve les espaces de bord du littéral d'origine
        const lead = node.value.match(/^\s*/)[0], trail = node.value.match(/\s*$/)[0];
        edits.push([node.range[0], node.range[1], quote(lead + dict[key] + trail, q)]);
      }
    } else if (node.type === 'TemplateElement') {
      const cooked = node.value.cooked;
      if (cooked) {
        const key = cooked.replace(/\s+/g, ' ').trim();
        if (key && dict[key] !== undefined) {
          const lead = cooked.match(/^\s*/)[0], trail = cooked.match(/\s*$/)[0];
          const repl = (lead + dict[key] + trail).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
          // la plage espree peut inclure les délimiteurs ` et ${ : ne remplacer que le texte brut
          const slice = code.slice(node.range[0], node.range[1]);
          const at = slice.indexOf(node.value.raw);
          if (at >= 0 && node.value.raw.length) {
            const s = node.range[0] + at;
            edits.push([s, s + node.value.raw.length, repl]);
          }
        }
      }
    }
    for (const k of Object.keys(node)) {
      if (k === 'parent' || k === 'range' || k === 'loc') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, node));
      else if (v && typeof v.type === 'string') walk(v, node);
    }
  };
  walk(ast, null);
  edits.sort((a, b) => b[0] - a[0]);
  let out = code;
  for (const [s, e, r] of edits) out = out.slice(0, s) + r + out.slice(e);
  if (edits.length) fs.writeFileSync(path, out);
  console.log(`${f}: ${edits.length}`);
  total += edits.length;
}
console.log('total', total);
