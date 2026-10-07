/*
 * Hand-written pages: About, Contact and the privacy policy.
 * `body` is trusted HTML placed inside the page's <section>.
 */
const REPO = "https://github.com/hitman449/hello-model";

module.exports = [
  {
    path: "/about/",
    title: "About Hello Model",
    description: "Hello Model turns a plain-English idea into a step-by-step plan for building an AI or machine learning model, with the right tools and cloud services.",
    body: `
      <h1 class="page-title">About Hello Model</h1>
      <p class="lead-left">A free guide that helps anyone go from “I have an idea for an AI model” to a working plan.</p>
      <div class="card prose">
        <h2>What it does</h2>
        <p>Describe what you want a model to do, in your own words. Hello Model works out which kind of model fits, asks a few short questions about your data, experience and budget, and builds a personalised step-by-step guide: what data to collect, which model to start with, copy-ready code, how to measure success, and which cloud services to use.</p>
        <h2>Who it's for</h2>
        <p>Developers, analysts, students and founders who want to build a model but aren't sure where to start, and teams who want a shared plan before committing time and money.</p>
        <h2>How it's built</h2>
        <p>The guides follow the same proven loop used by machine learning teams: define the problem, collect and prepare data, beat a simple baseline, evaluate honestly, deploy, and monitor. Each plan recommends the simplest approach that could work, and only suggests more complex options when your data and goals call for them.</p>
        <h2>Learn the basics</h2>
        <ul>
          <li><a href="/models/">Model library</a>: ten common kinds of model and three ways to build each one.</li>
          <li><a href="/training/">Training basics</a>: short lessons on splits, overfitting, metrics and costs.</li>
          <li><a href="/clouds/">Cloud comparison</a>: the matching service on AWS, Google Cloud, Azure and open source.</li>
          <li><a href="/glossary/">Glossary</a>: plain-English definitions of the jargon.</li>
        </ul>
        <h2>Your privacy</h2>
        <p>Your descriptions and plans stay in your own browser. See the <a href="/privacy/">privacy policy</a> for details.</p>
      </div>`
  },
  {
    path: "/contact/",
    title: "Contact",
    description: "How to get in touch with Hello Model: report a mistake, suggest a model type or ask a question.",
    body: `
      <h1 class="page-title">Contact</h1>
      <p class="lead-left">Spotted a mistake, want a new model type covered, or have a question? We'd love to hear from you.</p>
      <div class="card prose">
        <h2>Send us a message</h2>
        <p>The quickest way to reach us is to <a href="${REPO}/issues/new" target="_blank" rel="noopener">open an issue on GitHub</a>. You'll need a free GitHub account. Please don't include personal or confidential information, because issues are public.</p>
        <h2>Corrections</h2>
        <p>Cloud services, prices and model names change often. If something on the site is out of date, let us know which page it's on and we'll fix it.</p>
      </div>`
  },
  {
    path: "/privacy/",
    title: "Privacy policy",
    description: "How Hello Model handles your data: descriptions and plans stay in your browser; ads may use cookies.",
    body: `
      <h1 class="page-title">Privacy policy</h1>
      <p class="lead-left">Last updated: October 2026</p>
      <div class="card prose">
        <h2>What stays on your device</h2>
        <p>The descriptions you type, your answers and your saved plans are processed and stored only in your own browser (using <code>localStorage</code>). They are never sent to our servers. You can delete a plan from <a href="/#/plans">My plans</a>, or clear all data by clearing this site's data in your browser.</p>
        <h2>Advertising</h2>
        <p>This site may show ads served by Google AdSense. Google and its partners use cookies to serve ads based on your visits to this and other websites. Google's use of advertising cookies enables it and its partners to serve ads based on your browsing.</p>
        <p>You can opt out of personalised advertising in <a href="https://adssettings.google.com" target="_blank" rel="noopener">Google Ads Settings</a>. Learn more about <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">how Google uses information from sites that use its services</a>.</p>
        <p>Visitors in the European Economic Area, the UK and Switzerland are asked for consent before personalised ads are shown.</p>
        <h2>Fonts</h2>
        <p>Text is displayed with a font loaded from Google Fonts, which receives your IP address when the font is downloaded.</p>
        <h2>Contact</h2>
        <p>Questions about this policy? See the <a href="/contact/">contact page</a>.</p>
      </div>`
  }
];
