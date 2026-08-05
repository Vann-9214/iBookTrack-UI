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

  // We are replacing ternary strings with literal strings 'bg-primary'
  content = content.replace(/brand === 'jaguar' \? 'bg-(green|emerald)-(500|600)' : 'bg-blue-(500|600)'/g, "'bg-primary'");
  content = content.replace(/brand === 'jaguar' \? 'text-(green|emerald)-(500|600)' : 'text-blue-(500|600)'/g, "'text-primary'");
  content = content.replace(/brand === 'jaguar' \? 'border-(green|emerald)-(300|500)' : 'border-blue-(300|500)'/g, "'border-primary'");
  
  // Also replace inverted ternaries if any (blue then green)
  content = content.replace(/brand === 'jaguar' \? 'bg-blue-(500|600)' : 'bg-(green|emerald)-(500|600)'/g, "'bg-primary'");
  
  content = content.replace(/brand === 'jaguar' \? "focus-visible:border-emerald-300 focus-visible:ring-emerald-100\\\/50" : "focus-visible:border-blue-300 focus-visible:ring-blue-100\\\/50"/g, "\"focus-visible:border-primary focus-visible:ring-primary/50\"");

  // Catch other forms that might use double quotes
  content = content.replace(/brand === 'jaguar' \? "text-emerald-500 group-focus-within:text-emerald-600" : "text-blue-500 group-focus-within:text-blue-600"/g, "\"text-primary group-focus-within:text-primary\"");

  // PageHeader explicit cn replacement
  content = content.replace(/brand === 'jaguar' \? 'bg-emerald-600' : 'bg-blue-600'/g, "'bg-primary'");
  content = content.replace(/brand === 'jaguar'\s*\n\s*\? 'bg-emerald-600'\s*\n\s*: 'bg-blue-600'/g, "'bg-primary'");

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
    count++;
  }
});

console.log('Done! Updated ' + count + ' files.');
