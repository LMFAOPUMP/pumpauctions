const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// Fix the corrupted syntax block:
const badBlock = `                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-36 w-full rounded-xl object-cover"
                  />
                  Recommended format: 1:1 (example: 1080x1080px). Max 8MB (PNG, JPG, WEBP). Your image
                    <p className="text-sm text-neonCyan">Click to upload your visual</p>
                    <p className="mt-1 text-xs text-white/60">PNG / JPG / WEBP, max 8MB</p>
                  </>
                )}
              </label>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                Recommended format: 16:9 (example: 1920x1080px). Max 8MB (PNG, JPG, WEBP). Your image
                will be stretched to fill the billboard.
              </p>`;

const goodBlock = `                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-36 w-full rounded-xl object-cover"
                  />
                ) : (
                  <>
                    <p className="text-sm text-neonCyan">Click to upload your visual</p>
                    <p className="mt-1 text-xs text-white/60">PNG / JPG / WEBP, max 8MB</p>
                  </>
                )}
              </label>
              <p className="mt-2 text-xs leading-relaxed text-white/70">
                Recommended format: 1:1 (example: 1080x1080px). Max 8MB (PNG, JPG, WEBP). Your image 
                will be stretched to fill the billboard.
              </p>`;

code = code.replace(badBlock, goodBlock);
fs.writeFileSync('app/page.tsx', code);
