module.exports = {
  ci: {
    collect: {
      url: [
      "http://localhost:8080/about",
      "http://localhost:8080/ai-policy",
      "http://localhost:8080/contact",
      "http://localhost:8080/content/annotations/clinard-dissertation",
      "http://localhost:8080/content/annotations/college-admissions-and-the-stability-of-marriage",
      "http://localhost:8080/content/annotations/simple-economics-of-open-source",
      "http://localhost:8080/content/articles/binglish",
      "http://localhost:8080/content/articles/hello-blog",
      "http://localhost:8080/content/articles/littlefield",
      "http://localhost:8080/content/articles/resume-ci-pipeline"
],
      numberOfRuns: 1,
    },
    upload: {
      target: 'filesystem',
      outputDir: './utils/lighthouse/raw/lhci',
    },
  },
};
