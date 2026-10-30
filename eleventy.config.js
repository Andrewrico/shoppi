const pluginRss = require("@11ty/eleventy-plugin-rss");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);

  eleventyConfig.addPassthroughCopy("src/assets/js");
  eleventyConfig.addPassthroughCopy("src/assets/images");
  eleventyConfig.addPassthroughCopy("src/admin/config.yml");

  eleventyConfig.addFilter("money", (cents, currency = "USD", locale = "en-US") =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format((cents || 0) / 100)
  );
  eleventyConfig.addFilter("isoDate", (date) => new Date(date).toISOString().slice(0, 10));
  eleventyConfig.addFilter("readableDate", (date) =>
    new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(date))
  );
  eleventyConfig.addFilter("head", (array, count) => (array || []).slice(0, count));
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value).replace(/</g, "\\u003c"));
  eleventyConfig.addFilter("excerpt", (text, length = 160) => {
    const plain = String(text || "").replace(/\s+/g, " ").trim();
    return plain.length > length ? `${plain.slice(0, length - 1).trimEnd()}…` : plain;
  });

  eleventyConfig.addCollection("posts", (api) =>
    api
      .getFilteredByGlob("src/blog/*.md")
      .filter((post) => !post.data.draft && post.date <= new Date())
      .sort((a, b) => b.date - a.date)
  );

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html", "11ty.js"],
  };
};
