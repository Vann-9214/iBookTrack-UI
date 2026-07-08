const fs = require('fs');
const files = [
  'frontend/app/Dashboard/page.tsx',
  'frontend/app/checkpoints/page.tsx',
  'frontend/app/inventory/page.tsx',
  'frontend/app/locator/page.tsx',
  'frontend/app/qa/page.tsx',
  'frontend/app/reports/page.tsx',
  'frontend/app/transmission/page.tsx',
  'frontend/app/warehouse/page.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (!content.includes('import { RefreshControl }')) {
    content = content.replace(/import\s+\{[^}]*\}\s+from\s+['"]lucide-react['"]/g, (match) => {
      return match + `\nimport { RefreshControl } from "@/components/refresh-control"`;
    });
    changed = true;
  }

  // Find all buttons containing RefreshCw
  // A bit robust regex: 
  const regex = /<Button[^>]*onClick=\{([^}]+)\}[^>]*disabled=\{([^}]+)\}[^>]*>[\s\S]*?<RefreshCw[^>]*>[\s\S]*?<\/Button>/g;
  
  content = content.replace(regex, (match, onClick, disabled) => {
    changed = true;
    const pageName = file.split('/')[2];
    return `<RefreshControl onRefresh={${onClick}} refreshing={${disabled}} storageKey="${pageName}" />`;
  });

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
}
