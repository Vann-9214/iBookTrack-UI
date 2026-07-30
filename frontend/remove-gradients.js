const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components');
const featuresDir = path.join(__dirname, 'features');
const appDir = path.join(__dirname, 'app');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        filelist = walkSync(path.join(dir, file), filelist);
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const allFiles = [...walkSync(dir), ...walkSync(featuresDir), ...walkSync(appDir)];

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Blue solid (from-blue-500 to-indigo-600, etc)
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-blue-500(\s+via-blue-[0-9]+)?\s+to-indigo-600/g, 'bg-blue-600');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-indigo-[0-9]+\s+to-blue-[0-9]+/g, 'bg-blue-600');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-blue-[0-9]+\s+via-blue-[0-9]+(\/[0-9]+)?\s+to-indigo-[0-9]+(\/[0-9]+)?/g, 'bg-blue-600');

  // Emerald solid (from-emerald-500 to-green-600, etc)
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-emerald-500(\s+via-emerald-[0-9]+)?\s+to-green-600/g, 'bg-emerald-600');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-emerald-[0-9]+\s+to-green-[0-9]+/g, 'bg-emerald-600');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-emerald-[0-9]+\s+via-emerald-[0-9]+(\/[0-9]+)?\s+to-emerald-[0-9]+(\/[0-9]+)?/g, 'bg-emerald-600');

  // Red/Rose solid
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-red-500(\s+via-red-[0-9]+)?\s+to-red-600/g, 'bg-red-600');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-red-500(\s+via-rose-[0-9]+)?\s+to-rose-600/g, 'bg-red-600');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-rose-500(\s+via-rose-[0-9]+)?\s+to-red-600/g, 'bg-red-600');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-red-600\s+to-rose-600/g, 'bg-red-600');

  // Amber solid
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-amber-[0-9]+\s+to-orange-[0-9]+/g, 'bg-amber-600');

  // Blue light (from-blue-50 via-card to-indigo-100/60, etc)
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-blue-50(\/[0-9]+)?\s+via-[a-zA-Z0-9-]+\s+to-indigo-100(\/[0-9]+)?/g, 'bg-blue-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-blue-[0-9]+(\/[0-9]+)?\s+via-transparent\s+to-indigo-[0-9]+(\/[0-9]+)?/g, 'bg-blue-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-blue-50\s+to-indigo-50/g, 'bg-blue-50');

  // Emerald light
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-emerald-50(\/[0-9]+)?\s+via-[a-zA-Z0-9-]+\s+to-[a-zA-Z0-9-]+100(\/[0-9]+)?/g, 'bg-emerald-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-emerald-[0-9]+(\/[0-9]+)?\s+via-transparent\s+to-emerald-[0-9]+(\/[0-9]+)?/g, 'bg-emerald-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-emerald-50\s+to-green-50/g, 'bg-emerald-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-emerald-50\s+via-card\s+to-card/g, 'bg-emerald-50');

  // Red/Rose light
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-red-50(\/[0-9]+)?\s+via-[a-zA-Z0-9-]+\s+to-[a-zA-Z0-9-]+100(\/[0-9]+)?/g, 'bg-red-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-rose-50(\/[0-9]+)?\s+via-[a-zA-Z0-9-]+\s+to-[a-zA-Z0-9-]+100(\/[0-9]+)?/g, 'bg-red-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-red-50\s+to-rose-50/g, 'bg-red-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-rose-50(\/[0-9]+)?\s+via-card\s+to-(red|rose)-50(\/[0-9]+)?/g, 'bg-red-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-rose-50\s+via-card\s+to-rose-50(\/[0-9]+)?/g, 'bg-red-50');

  // Amber light
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-amber-50(\/[0-9]+)?\s+via-card\s+to-amber-50(\/[0-9]+)?/g, 'bg-amber-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-amber-50(\/[0-9]+)?\s+via-[a-zA-Z0-9-]+\s+to-amber-100(\/[0-9]+)?/g, 'bg-amber-50');

  // Edge cases
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-emerald-50\/80\s+via-white\s+to-emerald-100\/50/g, 'bg-emerald-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-blue-50\/80\s+via-white\s+to-indigo-100\/50/g, 'bg-blue-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-rose-50\/80\s+via-white\s+to-red-100\/50/g, 'bg-red-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-amber-50\/80\s+via-white\s+to-amber-100\/50/g, 'bg-amber-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-blue-50\s+via-card\s+to-indigo-50\/60/g, 'bg-blue-50');
  content = content.replace(/bg-gradient-to-[a-z]+\s+from-emerald-50\s+via-card\s+to-card/g, 'bg-emerald-50');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
