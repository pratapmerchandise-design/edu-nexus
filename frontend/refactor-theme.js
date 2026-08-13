const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let i = 0;
    (function next() {
      let file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            next();
          });
        } else {
          if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
          }
          next();
        }
      });
    })();
  });
};

const replacements = [
  // Backgrounds
  { regex: /bg-\[#(0e1410|121914|0e1511)\]/g, replacement: 'bg-card' },
  { regex: /bg-\[#(131b16|131c16|141d17|0b100d)\]/g, replacement: 'bg-secondary' },
  { regex: /bg-\[#(050706|070b08)\]/g, replacement: 'bg-background' },
  
  // Borders
  { regex: /border-white\/(5|10|20)/g, replacement: 'border-border' },
  { regex: /border-\[#22e079\]\/([0-9]+)/g, replacement: 'border-primary/$1' },
  { regex: /border-\[#22e079\]/g, replacement: 'border-primary' },
  
  // Texts
  { regex: /text-white/g, replacement: 'text-foreground' },
  { regex: /text-\[#f7faf8\]/g, replacement: 'text-foreground' },
  { regex: /text-\[#(c2cbc5|c4d0c8)\]/g, replacement: 'text-foreground/90' },
  { regex: /text-\[#(7d8b82|8e9c93|829186|6e7b72|647269|78887e|5d6a61|6b7970|6d7971|9ca6a0|839288|aeb8b2|738077)\]/g, replacement: 'text-muted-foreground' },
  { regex: /text-\[#22e079\]/g, replacement: 'text-primary' },
  { regex: /text-\[#(04140b|050706)\]/g, replacement: 'text-primary-foreground' },
  
  // Fills & Rings & Bg
  { regex: /bg-\[#22e079\]/g, replacement: 'bg-primary' },
  { regex: /fill-\[#22e079\]/g, replacement: 'fill-primary' },
  { regex: /ring-\[#22e079\]/g, replacement: 'ring-primary' },
  { regex: /focus:border-\[#22e079\]/g, replacement: 'focus:border-primary' },
  
  // Special Shadows
  { regex: /shadow-\[0_0_[0-9]+px_rgba\(34,224,121,[0-9.]+\)\]/g, replacement: 'shadow-md shadow-primary/20' },
  
  // Placeholders
  { regex: /placeholder-\[#5d6a61\]/g, replacement: 'placeholder-muted-foreground' },
  { regex: /placeholder-\[#78887e\]/g, replacement: 'placeholder-muted-foreground' },
  
  // Specific exceptions handling
  { regex: /bg-black\/40/g, replacement: 'bg-black/20 dark:bg-black/40' },
  { regex: /bg-black\/80/g, replacement: 'bg-black/50 dark:bg-black/80' }
];

walk(path.join(__dirname, 'src'), (err, files) => {
  if (err) throw err;
  let changedFiles = 0;
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    replacements.forEach(({regex, replacement}) => {
      content = content.replace(regex, replacement);
    });
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      changedFiles++;
      console.log('Updated: ' + path.relative(__dirname, file));
    }
  });
  
  console.log(`\nCompleted! Updated ${changedFiles} files.`);
});
