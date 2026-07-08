const fs = require('fs');
const files = [
  'frontend/app/checkpoints/page.tsx',
  'frontend/app/inventory/page.tsx',
  'frontend/app/qa/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import { RefreshControl }')) {
    content = content.replace(/import\s+\{[^}]*\}\s+from\s+['"]lucide-react['"]/g, (match) => {
      return match + `\nimport { RefreshControl } from "@/components/refresh-control"`;
    });
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
}
