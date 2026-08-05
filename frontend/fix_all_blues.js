const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
};

const files = walk('C:/Users/2PH3776/Documents/GitHub/iBookTrack/frontend');

let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace background colors (prominent ones)
  content = content.replace(/bg-blue-(400|500|600)/g, "bg-primary");
  content = content.replace(/bg-green-(400|500|600)/g, "bg-primary");
  content = content.replace(/bg-emerald-(400|500|600)/g, "bg-primary");
  
  // Replace text colors
  content = content.replace(/text-blue-(400|500|600)/g, "text-primary");
  content = content.replace(/text-green-(400|500|600)/g, "text-primary");
  content = content.replace(/text-emerald-(400|500|600)/g, "text-primary");

  // Replace border colors
  content = content.replace(/border-blue-(400|500|600)/g, "border-primary");
  content = content.replace(/border-green-(400|500|600)/g, "border-primary");
  content = content.replace(/border-emerald-(400|500|600)/g, "border-primary");

  // Replace ring colors
  content = content.replace(/ring-blue-(400|500|600)/g, "ring-primary");
  content = content.replace(/ring-green-(400|500|600)/g, "ring-primary");
  content = content.replace(/ring-emerald-(400|500|600)/g, "ring-primary");

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
    count++;
  }
});

console.log('Done! Updated ' + count + ' files.');
