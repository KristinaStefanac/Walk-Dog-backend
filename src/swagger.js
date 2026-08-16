import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Load the local OpenAPI spec from docs/openapi.yaml */
export function buildSwaggerSpec() {
  const filePath = path.join(__dirname, '..', 'docs', 'openapi.yaml')
  const raw = fs.readFileSync(filePath, 'utf8')
  return yaml.load(raw)
}
