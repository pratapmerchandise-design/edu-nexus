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

walk(path.join(__dirname, 'src'), (err, files) => {
  if (err) throw err;
  let changedFiles = 0;
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Generic cleanup for any remaining hardcoded hex classes
    content = content.replace(/text-\[#[a-fA-F0-9]{6}\]/g, (match) => {
      if (match.includes('22e079')) return 'text-primary';
      if (match.includes('f7faf8') || match.includes('ffffff')) return 'text-foreground';
      return 'text-muted-foreground';
    });

    content = content.replace(/bg-\[#[a-fA-F0-9]{6}\](\/[0-9]+)?/g, (match) => {
      if (match.includes('22e079')) return match.replace(/bg-\[#22e079\]/, 'bg-primary');
      if (match.includes('050706') || match.includes('f7faf8')) return 'bg-background';
      return 'bg-secondary';
    });

    content = content.replace(/border-\[#[a-fA-F0-9]{6}\]/g, (match) => {
      if (match.includes('22e079')) return 'border-primary';
      return 'border-border';
    });

    content = content.replace(/placeholder-\[#[a-fA-F0-9]{6}\]/g, 'placeholder-muted-foreground');
    content = content.replace(/fill-\[#[a-fA-F0-9]{6}\]/g, 'fill-primary');
    
    // Fix any leftover shadow hardcodes
    content = content.replace(/shadow-\[[^\]]+\]/g, 'shadow-sm');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      changedFiles++;
      console.log('Updated: ' + path.relative(__dirname, file));
    }
  });
  
  console.log(`\nCompleted! Updated ${changedFiles} files.`);
});
