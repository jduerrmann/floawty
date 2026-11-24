// Checks that exactly the tests that reach real input carry the `@real` tag.
import ts from 'typescript';

const REAL_TAG = '@real';
const REAL_MODULE = /(^|\/)real-input$/;
const MAY_IMPORT = (name: string) =>
  name === 'tests/app.ts' || name === 'tests/real-input.ts' || name.endsWith('.spec.ts');

const parse = (name: string, source: string) =>
  ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);

function isRealModule(node: ts.Node): boolean {
  const specifier = (node as ts.ImportDeclaration).moduleSpecifier;
  return Boolean(specifier && ts.isStringLiteral(specifier) && REAL_MODULE.test(specifier.text));
}

/** The local names this file gets from the real-input module. */
function realNames(file: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !isRealModule(statement)) continue;
    const { name, namedBindings } = statement.importClause ?? {};
    if (name) names.add(name.text);
    if (namedBindings && ts.isNamespaceImport(namedBindings)) names.add(namedBindings.name.text);
    if (namedBindings && ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) names.add(element.name.text);
    }
  }
  return names;
}

/** The top-level functions and constants of the file, by name. */
function helpersOf(file: ts.SourceFile): Map<string, ts.Node> {
  const helpers = new Map<string, ts.Node>();
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      helpers.set(statement.name.text, statement);
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const { name, initializer } of statement.declarationList.declarations) {
      if (ts.isIdentifier(name) && initializer) helpers.set(name.text, initializer);
    }
  }
  return helpers;
}

/** The real-input names that code reaches itself or through helpers of the file. */
function reachedNames(
  node: ts.Node,
  real: Set<string>,
  helpers: Map<string, ts.Node>,
  seen = new Set<string>(),
): Set<string> {
  const found = new Set<string>();
  const visit = (current: ts.Node): void => {
    if (ts.isPropertyAccessExpression(current)) return visit(current.expression);
    if (!ts.isIdentifier(current)) return ts.forEachChild(current, visit);
    const helper = helpers.get(current.text);
    if (real.has(current.text)) found.add(current.text);
    else if (helper && !seen.has(current.text)) {
      seen.add(current.text);
      for (const name of reachedNames(helper, real, helpers, seen)) found.add(name);
    }
  };
  visit(node);
  return found;
}

function titleOf(file: ts.SourceFile, node: ts.Expression): string {
  return ts.isStringLiteralLike(node) ? node.text : node.getText(file).slice(1, -1);
}

function isTagged(details: ts.Expression | undefined): boolean {
  if (!details || !ts.isObjectLiteralExpression(details)) return false;
  return details.properties.some((property) => {
    if (!ts.isPropertyAssignment(property) || property.name.getText() !== 'tag') return false;
    const value = property.initializer;
    const values = ts.isArrayLiteralExpression(value) ? value.elements : [value];
    return values.some((item) => ts.isStringLiteralLike(item) && item.text === REAL_TAG);
  });
}

const TEST_FORMS = new Set(['only', 'skip', 'fixme', 'fail']);
const HOOKS = new Set(['beforeEach', 'afterEach', 'beforeAll', 'afterAll']);

/** `test(…)` is "test", `test.skip(…)` is "skip"; anything else is undefined. */
function testCallee(node: ts.CallExpression): string | undefined {
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return callee.text === 'test' ? 'test' : undefined;
  const onTest =
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === 'test';
  return onTest ? callee.name.text : undefined;
}

function callsOf(file: ts.SourceFile, names: (name: string) => boolean): ts.CallExpression[] {
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    const name = ts.isCallExpression(node) ? testCallee(node) : undefined;
    if (name !== undefined && names(name)) calls.push(node as ts.CallExpression);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return calls;
}

const testCalls = (file: ts.SourceFile) =>
  callsOf(file, (name) => name === 'test' || TEST_FORMS.has(name)).filter(
    (call) => call.arguments.length >= 2,
  );

/** Hooks run for every test of the file, so real input there cannot be tagged per test. */
function hookProblems(
  fileName: string,
  file: ts.SourceFile,
  real: Set<string>,
  helpers: Map<string, ts.Node>,
): string[] {
  return callsOf(file, (name) => HOOKS.has(name)).flatMap((call) => {
    const reached = [...reachedNames(call, real, helpers)].sort();
    if (reached.length === 0) return [];
    return [`${fileName}: hook "${testCallee(call)}" uses real input (${reached.join(', ')})`];
  });
}

/** Problems of one spec file: a test that reaches real input without @real, or the reverse. */
export function scanSpec(fileName: string, source: string): string[] {
  const file = parse(fileName, source);
  const real = realNames(file);
  const helpers = helpersOf(file);
  const problems = hookProblems(fileName, file, real, helpers);
  for (const call of testCalls(file)) {
    const [first, second] = call.arguments as unknown as ts.Expression[];
    const body = call.arguments[call.arguments.length - 1] as ts.Expression;
    const reached = [...reachedNames(body, real, helpers)].sort();
    const title = `${fileName}: test "${titleOf(file, first as ts.Expression)}"`;
    const tagged = isTagged(call.arguments.length >= 3 ? second : undefined);
    if (reached.length > 0 && !tagged) {
      problems.push(`${title} uses real input (${reached.join(', ')}) but has no ${REAL_TAG} tag`);
    }
    if (reached.length === 0 && tagged) {
      problems.push(`${title} is tagged ${REAL_TAG} but reaches no real input`);
    }
  }
  return problems;
}

/** Problems of the files that import the real-input module without being allowed to. */
export function scanImports(files: { name: string; source: string }[]): string[] {
  return files
    .filter(({ name, source }) => {
      if (MAY_IMPORT(name)) return false;
      return parse(name, source).statements.some(
        (statement) =>
          (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
          isRealModule(statement),
      );
    })
    .map(({ name }) => `${name}: imports real-input; only tests/app.ts and spec files may`);
}
