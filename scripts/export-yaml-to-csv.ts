import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import type {
  Character,
  Composition,
  Expression,
  Outfit,
  Pose,
  Scene,
} from '../src/types';
import { serializeOutfitsCsv } from '../src/lib/csv/serializeOutfits';
import { serializeScenesCsv } from '../src/lib/csv/serializeScenes';
import { serializePosesCsv } from '../src/lib/csv/serializePoses';
import { serializeExpressionsCsv } from '../src/lib/csv/serializeExpressions';
import { serializeCompositionsCsv } from '../src/lib/csv/serializeCompositions';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, '..');
const OUT_DIR = join(ROOT, 'tmp', 'migration');

function readYaml<T>(relPath: string): T {
  const full = join(ROOT, relPath);
  return yaml.load(readFileSync(full, 'utf-8')) as T;
}

function writeFile(name: string, content: string): void {
  const path = join(OUT_DIR, name);
  writeFileSync(path, content, 'utf-8');
  console.log(`  → ${path}`);
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log('Exporting current YAML data to tmp/migration/...');

  const outfits = readYaml<Outfit[]>('src/data/styles/outfits.yaml') ?? [];
  writeFile('outfits.csv', serializeOutfitsCsv(outfits));

  const scenes = readYaml<Scene[]>('src/data/styles/scenes.yaml') ?? [];
  writeFile('scenes.csv', serializeScenesCsv(scenes));

  const poses = readYaml<Pose[]>('src/data/styles/poses.yaml') ?? [];
  writeFile('poses.csv', serializePosesCsv(poses));

  const expressions = readYaml<Expression[]>('src/data/styles/expressions.yaml') ?? [];
  writeFile('expressions.csv', serializeExpressionsCsv(expressions));

  const compositions = readYaml<Composition[]>('src/data/styles/compositions.yaml') ?? [];
  writeFile('compositions.csv', serializeCompositionsCsv(compositions));

  const charactersDir = join(ROOT, 'src/data/characters');
  const characterFiles = readdirSync(charactersDir).filter((f) => f.endsWith('.yaml'));
  const charactersMap: Record<string, Character> = {};
  for (const file of characterFiles) {
    const character = readYaml<Character>(`src/data/characters/${file}`);
    if (character && character.character_id) {
      charactersMap[character.character_id] = character;
    }
  }
  writeFile('characters.json', JSON.stringify(charactersMap, null, 2));

  console.log('\nDone. Save these files to a private backup location before emptying YAMLs.');
  console.log(`Summary: ${outfits.length} outfits, ${scenes.length} scenes, ${poses.length} poses,`);
  console.log(`         ${expressions.length} expressions, ${compositions.length} compositions,`);
  console.log(`         ${Object.keys(charactersMap).length} characters`);
}

main();
