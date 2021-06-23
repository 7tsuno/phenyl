const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const debug = require("debug")("inline-asset");

const indexPath = path.join(__dirname, "..", "build", "index.html");
const $ = cheerio.load(fs.readFileSync(indexPath, "utf8"));

// Embed extracted CSS
$('link[rel="stylesheet"]').each((i, el) => {
  const href = $(el).attr("href");
  // Preserve external css
  if (/^https?/.test(href)) {
    debug(`Preserve ${href}`);
    return;
  }

  const assetPath = path.join(__dirname, "..", "build", href);
  const content = fs.readFileSync(assetPath, "utf8");
  $("<style></style>")
    .text(content)
    .appendTo("head");

  debug(`Remove ${assetPath}`);
  $(el).remove(); // Remove from HTML
  fs.unlinkSync(assetPath); // Remove file
});

// Embed extracted JavaScript
$("script[src]").each((i, el) => {
  const src = $(el).attr("src");
  // Preserve external css
  if (/^https?/.test(src)) {
    debug(`Preserve ${src}`);
    return;
  }

  const assetPath = path.join(__dirname, "..", "build", src);
  const content = fs.readFileSync(assetPath, "utf8");
  $("<script></script>")
    .text(content)
    .appendTo("body");

  debug(`Remove ${assetPath}`);
  $(el).remove(); // Remove from HTML
  fs.unlinkSync(assetPath); // Remove file
});

// Inject entities
const phenylApiExplorerClientGlobals = $("<script></script>").text(`
  window.phenylApiExplorerClientGlobals = {
    phenylApiUrlBase: "<%- phenylApiUrlBase %>",
    PhenylFunctionalGroupSkeleton: <%- JSON.stringify(functionalGroup) %>,
  }
`);
$("script")
  .eq(0)
  .before(phenylApiExplorerClientGlobals);

fs.writeFileSync(indexPath, $.html(), "utf8");
