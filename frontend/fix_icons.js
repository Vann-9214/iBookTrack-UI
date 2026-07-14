const fs = require('fs');
const path = require('path');

const pageIcons = {
    'warehouse/page.tsx': { icon: 'Warehouse' },
    'inventory/page.tsx': { icon: 'Archive' },
    'qa/page.tsx': { icon: 'CheckCircle' },
    'scan/page.tsx': { icon: 'ScanBarcode' },
    'locator/page.tsx': { icon: 'Map' },
    'checkpoints/page.tsx': { icon: 'MapPin' },
    'reports/page.tsx': { icon: 'BarChart3' },
};

const baseDir = path.join(__dirname, 'app');

for (const [file, info] of Object.entries(pageIcons)) {
    const filePath = path.join(baseDir, path.normalize(file));
    if (!fs.existsSync(filePath)) continue;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace icon in header
    content = content.replace(/<([A-Za-z0-9]+) className="h-7 w-7" \/>/, `<${info.icon} className="h-7 w-7" />`);
    
    // Add import if needed
    if (!content.includes(`${info.icon},`) && !content.includes(` ${info.icon} `) && !content.includes(`${info.icon} }`)) {
        content = content.replace(/import \{([^}]+)\}\s+from\s+["']lucide-react["']/, (match, p1) => {
            return `import { ${p1.trim()}, ${info.icon} } from "lucide-react"`;
        });
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
}
