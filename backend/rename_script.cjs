const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '..'); // iBookTrack root
const extensions = ['.js', '.ts', '.tsx'];

function replaceInFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === '.next') continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            replaceInFiles(fullPath);
        } else if (extensions.includes(path.extname(fullPath))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            // Replace book_scans with book_activity
            content = content.replace(/book_scans/g, 'book_activity');
            
            // Replace warehouse_book_scans with book_activity just in case
            content = content.replace(/warehouse_book_scans/g, 'book_activity');
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

replaceInFiles(directoryPath);
