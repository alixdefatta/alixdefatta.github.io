const fs = require('fs');
const path = require('path');

// ─── CSV PARSER (RFC 4180) ────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;
  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
      else if (ch === '"') { inQuotes = false; i++; }
      else { field += ch; i++; }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === ',') { row.push(field); field = ''; i++; }
      else if (ch === '\r' && text[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 2; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
      else { field += ch; i++; }
    }
  }
  if (row.length > 0 || field !== '') { row.push(field); rows.push(row); }
  return rows;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function authorName(slug) {
  const map = { 'alix-defatta': 'Alix DeFatta', 'phil-defatta': 'Phil DeFatta' };
  return map[slug] || (slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'DeFatta Law Firm');
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function readingTime(html) {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 225));
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cleanHtml(html) {
  return html
    .replace(/ id=""/g, '')
    .replace(/ class="w-richtext[^"]*"/g, '')
    .replace(/ data-rt-[^=]*="[^"]*"/g, '')
    .replace(/<figure[^>]*>/g, '<figure class="blog-figure">')
    .replace(/\u200d/g, '')
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/https:\/\/www\.defattalaw\.com\/free-consultation/g, 'free-consultation.html')
    .replace(/https:\/\/www\.defattalaw\.com\/practice-areas\/car-wrecks/g, 'car-truck-accidents.html')
    .replace(/https:\/\/www\.defattalaw\.com\/practice-areas\/wrongful-death/g, 'wrongful-death.html')
    .replace(/https:\/\/www\.defattalaw\.com\/practice-areas\/nursing-home-abuse/g, 'nursing-home-abuse.html')
    .replace(/https:\/\/www\.defattalaw\.com\/practice-areas\/personal-injury/g, 'personal-injury.html')
    .replace(/https:\/\/www\.defattalaw\.com\/practice-areas\/civil-rights/g, 'civil-rights.html')
    .replace(/https:\/\/www\.defattalaw\.com\/practice-areas\/corporate-law/g, 'corporate-law.html')
    .replace(/https:\/\/www\.defattalaw\.com\/resources/g, 'resources.html')
    .replace(/href="https:\/\/www\.defattalaw\.com\/?"/g, 'href="index.html"');
}

// ─── SHARED CSS ──────────────────────────────────────────────────────────────
const SHARED_CSS = `
        :root {
            --primary: #233e82; --primary-dark: #1a2f62; --primary-light: #2d50a8;
            --secondary: #bf433a; --secondary-dark: #9e3830;
            --white: #ffffff; --light-gray: #f5f7fa; --gray: #dde2ee;
            --dark: #111827; --text: #374151; --text-light: #6b7280;
        }
        body { font-family: 'Lato', sans-serif; color: var(--text); line-height: 1.6; overflow-x: hidden; }
        h1, h2, h3, h4, h5 { font-family: 'Playfair Display', serif; line-height: 1.2; }
        a { text-decoration: none; color: inherit; }
        img { max-width: 100%; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .top-bar { background: var(--primary-dark); padding: 10px 0; }
        .top-bar .container { display: flex; justify-content: center; }
        .top-bar-text { color: rgba(255,255,255,0.85); font-size: 13px; letter-spacing: 0.3px; }
        .main-nav { background: white; padding: 0; box-shadow: 0 2px 12px rgba(0,0,0,0.10); position: sticky; top: 0; z-index: 1000; }
        .nav-inner { display: flex; justify-content: space-between; align-items: stretch; }
        .nav-logo { display: flex; align-items: center; padding: 10px 0; }
        .nav-logo-img { height: 62px; width: auto; display: block; }
        .nav-links-wrap { display: flex; align-items: stretch; }
        .nav-links { display: flex; list-style: none; align-items: stretch; gap: 0; margin: 0; padding: 0; }
        .nav-links li { display: flex; align-items: center; }
        .nav-links a { padding: 0 20px; font-size: 12px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--dark); transition: color 0.2s; display: flex; align-items: center; }
        .nav-links a:hover, .nav-links a.active { color: var(--secondary); }
        .nav-cta-wrap { display: flex; align-items: stretch; }
        .nav-cta { background: var(--secondary); color: white; padding: 0 28px; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; display: flex; align-items: center; transition: background 0.3s; white-space: nowrap; }
        .nav-cta:hover { background: var(--primary); color: white; }
        .nav-phone-block { background: var(--primary-dark); color: white; padding: 0 24px; display: flex; flex-direction: column; justify-content: center; text-align: right; }
        .nav-phone-block span { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.55); }
        .nav-phone-block a { color: white; font-size: 19px; font-weight: 900; letter-spacing: 0.5px; }
        .nav-hamburger { display: none; background: none; border: none; cursor: pointer; padding: 0 18px; color: var(--dark); align-items: center; justify-content: center; }
        .nav-hamburger svg { display: block; }
        .mobile-menu { display: none; background: white; border-top: 2px solid var(--primary); box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
        .mobile-menu.open { display: block; }
        .mobile-menu ul { list-style: none; padding: 0; margin: 0; }
        .mobile-menu ul li a { display: block; padding: 17px 24px; font-size: 12px; font-weight: 700; letter-spacing: 1.3px; text-transform: uppercase; color: var(--dark); border-bottom: 1px solid rgba(0,0,0,0.07); transition: color 0.2s, background 0.2s; }
        .mobile-menu ul li a:hover { color: var(--primary); background: rgba(35,62,130,0.05); }
        .mobile-cta-link { background: var(--secondary) !important; color: white !important; text-align: center; border-bottom: none !important; }
        .mobile-cta-link:hover { background: var(--primary) !important; color: white !important; }
        .mobile-cta-link { padding: 14px 24px; font-weight: 900; color: var(--secondary); text-align: center; font-size: 15px; }
        .cta-section { background: var(--primary-dark); padding: 80px 0; text-align: center; }
        .cta-section h2 { font-size: clamp(1.8rem, 3vw, 2.6rem); color: var(--white); margin-bottom: 16px; }
        .cta-section p { color: rgba(255,255,255,0.8); font-size: 1.05rem; max-width: 560px; margin: 0 auto 36px; line-height: 1.7; }
        .cta-phone { display: block; font-size: clamp(1.8rem, 3.5vw, 2.8rem); font-weight: 900; color: var(--white); letter-spacing: 1px; margin-bottom: 24px; }
        .cta-phone:hover { opacity: 0.85; }
        .btn-white { background: var(--white); color: var(--primary-dark); padding: 16px 40px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase; border-radius: 2px; display: inline-block; transition: background 0.2s; }
        .btn-white:hover { background: rgba(255,255,255,0.9); }
        .footer { background: var(--primary-dark); padding: 60px 0 0; }
        .footer-main { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; padding-bottom: 48px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .footer-logo-img { height: 60px; width: auto; display: block; margin-bottom: 16px; }
        .footer-about-text { color: rgba(255,255,255,0.6); font-size: 0.88rem; line-height: 1.7; }
        .footer-col-title { color: rgba(255,255,255,0.4); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; margin-bottom: 16px; }
        .footer-nav { list-style: none; padding: 0; margin: 0; }
        .footer-nav li { margin-bottom: 10px; }
        .footer-nav a { color: rgba(255,255,255,0.7); font-size: 0.88rem; transition: color 0.2s; }
        .footer-nav a:hover { color: var(--white); }
        .footer-contact-info { color: rgba(255,255,255,0.7); font-size: 0.88rem; line-height: 1.8; }
        .footer-big-phone { color: var(--white); font-size: 1.1rem; font-weight: 900; }
        .footer-big-phone:hover { opacity: 0.85; }
        .footer-tags-row { display: flex; flex-wrap: wrap; gap: 8px; padding: 24px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .footer-tag { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); font-size: 11px; padding: 4px 10px; border-radius: 3px; }
        .footer-disclaimer { color: rgba(255,255,255,0.35); font-size: 0.78rem; line-height: 1.6; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .footer-bottom-bar { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; color: rgba(255,255,255,0.35); font-size: 0.78rem; }`;

const SHARED_HEAD_LINKS = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet">`;

const SHARED_TOPBAR_NAV = (activeResources) => `
<div class="top-bar">
    <div class="container">
        <span class="top-bar-text">Proudly serving Huntsville, Athens, Decatur, Cullman, and all of North Alabama.</span>
    </div>
</div>
<nav class="main-nav">
    <div class="container nav-inner">
        <a href="index.html" class="nav-logo">
            <img src="defatta law logo.png" alt="DeFatta Law Firm" class="nav-logo-img">
        </a>
        <div class="nav-links-wrap">
            <ul class="nav-links">
                <li><a href="index.html#practice">Practice Areas</a></li>
                <li><a href="index.html#about">About</a></li>
                <li><a href="index.html#results">Results</a></li>
                <li><a href="resources.html"${activeResources ? ' class="active"' : ''}>Resources</a></li>
            </ul>
            <div class="nav-cta-wrap">
                <a href="free-consultation.html" class="nav-cta">Free Consultation</a>
            </div>
            <div class="nav-phone-block">
                <span>We're Open 24/7</span>
                <a href="tel:2562574674">256.257.4674</a>
            </div>
            <button class="nav-hamburger" id="nav-hamburger" aria-label="Open navigation menu">
                <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect y="0" width="26" height="3.5" rx="1.75" fill="currentColor"/>
                    <rect y="9.25" width="26" height="3.5" rx="1.75" fill="currentColor"/>
                    <rect y="18.5" width="26" height="3.5" rx="1.75" fill="currentColor"/>
                </svg>
            </button>
        </div>
    </div>
    <div class="mobile-menu" id="mobile-menu">
        <ul>
            <li><a href="index.html#practice">Practice Areas</a></li>
            <li><a href="index.html#about">About</a></li>
            <li><a href="index.html#results">Results</a></li>
            <li><a href="resources.html">Resources</a></li>
            <li><a href="free-consultation.html" class="mobile-cta-link">Free Consultation</a></li>
        </ul>
    </div>
</nav>`;

const SHARED_FOOTER = `
<footer class="footer">
    <div class="container">
        <div class="footer-main">
            <div>
                <img src="white logo defatta.png" alt="DeFatta Law Firm" class="footer-logo-img">
                <p class="footer-about-text">Providing stellar legal counsel and representation to Huntsville and North Alabama for over a decade. We proudly serve clients across Huntsville and all of North Alabama.</p>
            </div>
            <div>
                <div class="footer-col-title">Practice Areas</div>
                <ul class="footer-nav">
                    <li><a href="wrongful-death.html">Wrongful Death</a></li>
                    <li><a href="nursing-home-abuse.html">Nursing Home Abuse</a></li>
                    <li><a href="car-truck-accidents.html">Car &amp; Truck Wrecks</a></li>
                    <li><a href="personal-injury.html">Personal Injury</a></li>
                    <li><a href="civil-rights.html">Civil Rights</a></li>
                    <li><a href="corporate-law.html">Corporate Law</a></li>
                </ul>
            </div>
            <div>
                <div class="footer-col-title">Quick Links</div>
                <ul class="footer-nav">
                    <li><a href="index.html">Home</a></li>
                    <li><a href="index.html#about">About Phil DeFatta</a></li>
                    <li><a href="index.html#results">Case Results</a></li>
                    <li><a href="resources.html">Resources</a></li>
                    <li><a href="free-consultation.html">Free Consultation</a></li>
                </ul>
            </div>
            <div>
                <div class="footer-col-title">Contact Us</div>
                <p class="footer-contact-info">
                    DeFatta Law Firm<br>Huntsville, Alabama<br><br>
                    <a href="tel:2562574674" class="footer-big-phone">256.257.4674</a><br><br>
                    Available 24 hours, 7 days a week
                </p>
            </div>
        </div>
        <div class="footer-tags-row">
            <span class="footer-tag">Personal Injury Attorney Huntsville</span>
            <span class="footer-tag">DeFatta Law Firm</span>
            <span class="footer-tag">Free Legal Consultation</span>
            <span class="footer-tag">Personal Injury Attorney Alabama</span>
            <span class="footer-tag">North Alabama Lawyer</span>
        </div>
        <p class="footer-disclaimer">The information on this website is for general informational purposes only and does not constitute legal advice. No attorney-client relationship is formed by viewing this site or reading any article herein. Results described are not a guarantee of future outcomes. DeFatta Law Firm is licensed to practice law in the State of Alabama.</p>
        <div class="footer-bottom-bar">
            <p>&copy; 2025 DeFatta Law Firm. All rights reserved.</p>
            <p>Huntsville, Alabama Personal Injury Attorney</p>
        </div>
    </div>
</footer>
<script>
    document.getElementById('nav-hamburger').addEventListener('click', function() {
        document.getElementById('mobile-menu').classList.toggle('open');
    });
</script>`;

// ─── BLOG POST TEMPLATE ──────────────────────────────────────────────────────
function buildPostHTML(post) {
  const { title, slug, date, rawDate, excerpt, content, image, author } = post;
  const cleanedContent = cleanHtml(content);
  const readMins = readingTime(content);
  const authorDisplay = authorName(author);
  const safeTitle = escapeAttr(title);
  const rawExcerpt = excerpt || stripHtml(content).slice(0, 160);
  const safeExcerpt = escapeAttr(rawExcerpt);
  const isoDate = (() => { try { return new Date(rawDate).toISOString(); } catch(e) { return ''; } })();

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} | DeFatta Law Firm — Huntsville, AL</title>
    <meta name="description" content="${safeExcerpt}">
    <link rel="canonical" href="https://www.defattalaw.com/resources/${slug}">
    <!-- Open Graph -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="${safeTitle} | DeFatta Law Firm">
    <meta property="og:description" content="${safeExcerpt}">
    <meta property="og:url" content="https://www.defattalaw.com/resources/${slug}">
    <meta property="og:site_name" content="DeFatta Law Firm">
    ${image ? `<meta property="og:image" content="${image}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">` : ''}
    ${isoDate ? `<meta property="article:published_time" content="${isoDate}">` : ''}
    <meta property="article:author" content="${authorDisplay}">
    <meta property="article:section" content="Legal Resources">
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle} | DeFatta Law Firm">
    <meta name="twitter:description" content="${safeExcerpt}">
    ${image ? `<meta name="twitter:image" content="${image}">` : ''}
    <!-- SEO & AI Crawler Permissions -->
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="googlebot" content="index, follow">
    <meta name="GPTBot" content="index, follow">
    <meta name="ClaudeBot" content="index, follow">
    <meta name="Google-Extended" content="index, follow">
    <meta name="PerplexityBot" content="index, follow">
    <meta name="CCBot" content="index, follow">
    <meta name="anthropic-ai" content="index, follow">
    <meta name="geo.region" content="US-AL">
    <meta name="geo.placename" content="Huntsville, Alabama">
    <meta name="geo.position" content="34.7304;-86.5861">
    <!-- Article Schema -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${safeTitle}",
      "description": "${safeExcerpt}",
      "author": {
        "@type": "Person",
        "name": "${authorDisplay}",
        "jobTitle": "Personal Injury Attorney",
        "worksFor": { "@type": "LegalService", "name": "DeFatta Law Firm" }
      },
      "publisher": {
        "@type": "LegalService",
        "name": "DeFatta Law Firm",
        "url": "https://www.defattalaw.com",
        "logo": { "@type": "ImageObject", "url": "https://www.defattalaw.com/defatta-law-logo.png" },
        "telephone": "+1-256-257-4674",
        "address": { "@type": "PostalAddress", "streetAddress": "200 West Side Square", "addressLocality": "Huntsville", "addressRegion": "AL", "postalCode": "35801", "addressCountry": "US" }
      },
      ${isoDate ? `"datePublished": "${isoDate}",
      "dateModified": "${isoDate}",` : ''}
      "url": "https://www.defattalaw.com/resources/${slug}",
      "mainEntityOfPage": "https://www.defattalaw.com/resources/${slug}"${image ? `,\n      "image": { "@type": "ImageObject", "url": "${image}", "width": 1200, "height": 630 }` : ''}
    }
    </script>
    <!-- Breadcrumb Schema -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.defattalaw.com/" },
        { "@type": "ListItem", "position": 2, "name": "Resources", "item": "https://www.defattalaw.com/resources" },
        { "@type": "ListItem", "position": 3, "name": "${safeTitle}", "item": "https://www.defattalaw.com/resources/${slug}" }
      ]
    }
    </script>
${SHARED_HEAD_LINKS}
    <style>
${SHARED_CSS}

        /* POST HERO */
        .post-hero { position: relative; background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%); padding: 64px 0; overflow: hidden; }
        .post-hero::before { content: ''; position: absolute; inset: 0; background: url('Huntsville background.png') center / cover no-repeat; opacity: 0.1; pointer-events: none; }
        .post-hero-inner { position: relative; z-index: 1; max-width: 900px; }
        .breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.6); flex-wrap: wrap; }
        .breadcrumb a { color: rgba(255,255,255,0.6); transition: color 0.2s; }
        .breadcrumb a:hover { color: var(--white); }
        .breadcrumb-sep { opacity: 0.4; }
        .breadcrumb-current { color: rgba(255,255,255,0.9); max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .post-hero h1 { font-size: clamp(1.6rem, 3.5vw, 2.5rem); color: var(--white); margin-bottom: 24px; font-weight: 700; line-height: 1.25; }
        .post-meta { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
        .post-meta-item { display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.75); font-size: 13px; }
        .post-meta-item svg { width: 15px; height: 15px; fill: rgba(255,255,255,0.6); flex-shrink: 0; }

        /* ARTICLE LAYOUT */
        .article-section { padding: 60px 0 80px; background: var(--light-gray); }
        .article-grid { display: grid; grid-template-columns: 1fr 320px; gap: 36px; align-items: start; }
        .featured-image-wrap { margin-bottom: 0; border-radius: 6px 6px 0 0; overflow: hidden; }
        .featured-image-wrap img { width: 100%; height: 380px; object-fit: cover; display: block; }
        .article-card { background: var(--white); border-radius: 6px; box-shadow: 0 2px 16px rgba(35,62,130,0.06); overflow: hidden; }
        .article-card-body { padding: 44px 48px; }
        .article-content h1 { font-size: 1.5rem; color: var(--primary); margin: 32px 0 14px; }
        .article-content h2 { font-size: 1.35rem; color: var(--primary); margin: 36px 0 14px; padding-top: 8px; border-top: 2px solid var(--gray); }
        .article-content h2:first-child { border-top: none; margin-top: 0; padding-top: 0; }
        .article-content h3 { font-size: 1.15rem; color: var(--primary-dark); margin: 28px 0 10px; }
        .article-content h4 { font-size: 1rem; color: var(--dark); margin: 20px 0 8px; font-weight: 700; }
        .article-content p { margin-bottom: 18px; line-height: 1.8; font-size: 1rem; color: var(--text); }
        .article-content ul, .article-content ol { margin: 0 0 20px 24px; }
        .article-content li { margin-bottom: 8px; line-height: 1.7; font-size: 1rem; }
        .article-content a { color: var(--primary); text-decoration: underline; font-weight: 600; }
        .article-content a:hover { color: var(--secondary); }
        .article-content strong { color: var(--dark); }
        .article-content em { font-style: italic; }
        .blog-figure { margin: 28px 0; border-radius: 4px; overflow: hidden; }
        .blog-figure img { width: 100%; height: auto; display: block; max-height: 480px; object-fit: cover; }
        .article-footer { margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--gray); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .back-link { display: inline-flex; align-items: center; gap: 8px; color: var(--primary); font-weight: 700; font-size: 0.88rem; text-transform: uppercase; letter-spacing: 0.5px; transition: color 0.2s; }
        .back-link:hover { color: var(--secondary); }

        /* SIDEBAR */
        .article-sidebar { position: sticky; top: 100px; display: flex; flex-direction: column; gap: 24px; }
        .sidebar-cta-card { background: var(--primary-dark); border-radius: 6px; padding: 28px 24px; color: var(--white); }
        .sidebar-cta-card h3 { font-size: 1.2rem; color: var(--white); margin-bottom: 10px; }
        .sidebar-cta-card p { font-size: 0.88rem; color: rgba(255,255,255,0.8); line-height: 1.6; margin-bottom: 20px; }
        .sidebar-phone { display: block; font-size: 1.4rem; font-weight: 900; color: var(--white); letter-spacing: 0.5px; margin-bottom: 14px; }
        .sidebar-phone:hover { opacity: 0.85; }
        .btn-cta-red { display: block; background: var(--secondary); color: var(--white); text-align: center; padding: 14px 20px; font-weight: 700; font-size: 13px; letter-spacing: 0.5px; text-transform: uppercase; border-radius: 2px; transition: background 0.2s; }
        .btn-cta-red:hover { background: var(--secondary-dark); }
        .sidebar-practice-card { background: var(--white); border-radius: 6px; padding: 24px; box-shadow: 0 2px 12px rgba(35,62,130,0.06); }
        .sidebar-practice-title { font-size: 0.75rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-light); font-family: 'Lato', sans-serif; font-weight: 700; margin-bottom: 14px; }
        .practice-link-list { list-style: none; padding: 0; margin: 0; }
        .practice-link-list li { border-bottom: 1px solid var(--gray); }
        .practice-link-list li:last-child { border-bottom: none; }
        .practice-link-list a { display: block; padding: 10px 0; font-size: 0.92rem; font-weight: 700; color: var(--primary); transition: color 0.2s; }
        .practice-link-list a:hover { color: var(--secondary); }

        /* RESPONSIVE */
        @media (max-width: 960px) { .article-grid { grid-template-columns: 1fr; } .article-sidebar { position: static; } }
        @media (max-width: 768px) {
            .top-bar { display: none; } .nav-links-wrap { display: none; } .nav-hamburger { display: flex; color: #233e82; }
            .article-card-body { padding: 28px 20px; }
            .featured-image-wrap img { height: 240px; }
            .footer-main { grid-template-columns: 1fr 1fr; }
            .footer-bottom-bar { flex-direction: column; gap: 8px; text-align: center; }
        }
        @media (max-width: 480px) { .footer-main { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
${SHARED_TOPBAR_NAV(false)}

<section class="post-hero">
    <div class="container">
        <div class="post-hero-inner">
            <div class="breadcrumb">
                <a href="index.html">Home</a>
                <span class="breadcrumb-sep">›</span>
                <a href="resources.html">Resources</a>
                <span class="breadcrumb-sep">›</span>
                <span class="breadcrumb-current">${safeTitle}</span>
            </div>
            <h1>${title}</h1>
        </div>
    </div>
</section>

<section class="article-section">
    <div class="container">
        <div class="article-grid">
            <div>
                <div class="article-card">
                    ${image ? `<div class="featured-image-wrap"><img src="${image}" alt="${safeTitle}" loading="eager"></div>` : ''}
                    <div class="article-card-body">
                        <div class="article-content">
                            ${cleanedContent}
                        </div>
                        <div class="article-footer">
                            <a href="resources.html" class="back-link">← Back to Resources</a>
                        </div>
                    </div>
                </div>
            </div>
            <aside class="article-sidebar">
                <div class="sidebar-cta-card">
                    <h3>Need Legal Help?</h3>
                    <p>Speak directly with attorney Phil DeFatta. Free consultation, no obligation, no upfront costs.</p>
                    <a href="tel:2562574674" class="sidebar-phone">256.257.4674</a>
                    <a href="free-consultation.html" class="btn-cta-red">Schedule Free Consultation</a>
                </div>
                <div class="sidebar-practice-card">
                    <div class="sidebar-practice-title">Practice Areas</div>
                    <ul class="practice-link-list">
                        <li><a href="wrongful-death.html">Wrongful Death</a></li>
                        <li><a href="nursing-home-abuse.html">Nursing Home Abuse</a></li>
                        <li><a href="car-truck-accidents.html">Car &amp; Truck Wrecks</a></li>
                        <li><a href="personal-injury.html">Personal Injury</a></li>
                        <li><a href="civil-rights.html">Civil Rights</a></li>
                        <li><a href="corporate-law.html">Corporate Law</a></li>
                    </ul>
                </div>
            </aside>
        </div>
    </div>
</section>

<section class="cta-section" id="contact">
    <div class="container">
        <h2>Need Legal Help in<br>North Alabama?</h2>
        <p>DeFatta Law Firm is here for you 24 hours a day, 7 days a week. Schedule your free consultation and speak directly with Phil DeFatta.</p>
        <a href="tel:2562574674" class="cta-phone">256.257.4674</a>
        <a href="free-consultation.html" class="btn-white">Schedule Free Consultation</a>
    </div>
</section>

${SHARED_FOOTER}
</body>
</html>`;
}

// ─── RESOURCES INDEX TEMPLATE ────────────────────────────────────────────────
function buildResourcesHTML(posts) {
  const cards = posts.map(post => {
    const rawExcerpt = post.excerpt || (stripHtml(post.content).slice(0, 140) + '...');
    const safeTitle = escapeAttr(post.title);
    const safeExcerpt = escapeAttr(rawExcerpt);
    return `            <article class="post-card">
                ${post.image
                  ? `<a href="blog-${post.slug}.html" class="post-card-img-wrap"><img src="${post.image}" alt="${safeTitle}" loading="lazy"></a>`
                  : '<div class="post-card-img-placeholder"></div>'}
                <div class="post-card-body">
                    <div class="post-card-meta">${post.date}</div>
                    <h2 class="post-card-title"><a href="blog-${post.slug}.html">${post.title}</a></h2>
                    <p class="post-card-excerpt">${safeExcerpt}</p>
                    <a href="blog-${post.slug}.html" class="post-card-link">Read Article →</a>
                </div>
            </article>`;
  }).join('\n');

  const itemList = posts.slice(0, 10).map((post, i) => `{ "@type": "ListItem", "position": ${i+1}, "name": "${escapeAttr(post.title)}", "url": "https://www.defattalaw.com/resources/${post.slug}" }`).join(',\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Personal Injury Law Blog | DeFatta Law Firm | Huntsville, AL</title>
    <meta name="description" content="${posts.length} free legal guides from DeFatta Law Firm — Huntsville's trusted personal injury attorneys. Learn your rights after car accidents, wrongful death, nursing home abuse, and more in North Alabama.">
    <link rel="canonical" href="https://www.defattalaw.com/resources">
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Personal Injury Law Blog | DeFatta Law Firm | Huntsville, AL">
    <meta property="og:description" content="${posts.length} free legal guides from DeFatta Law Firm. Know your rights after an injury in North Alabama.">
    <meta property="og:url" content="https://www.defattalaw.com/resources">
    <meta property="og:site_name" content="DeFatta Law Firm">
    <meta property="og:image" content="https://www.defattalaw.com/defatta-law-logo.png">
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Personal Injury Law Blog | DeFatta Law Firm | Huntsville, AL">
    <meta name="twitter:description" content="${posts.length} free legal guides from DeFatta Law Firm. Know your rights after an injury in North Alabama.">
    <meta name="twitter:image" content="https://www.defattalaw.com/defatta-law-logo.png">
    <!-- SEO & AI Crawler Permissions -->
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <meta name="googlebot" content="index, follow">
    <meta name="GPTBot" content="index, follow">
    <meta name="ClaudeBot" content="index, follow">
    <meta name="Google-Extended" content="index, follow">
    <meta name="PerplexityBot" content="index, follow">
    <meta name="CCBot" content="index, follow">
    <meta name="anthropic-ai" content="index, follow">
    <meta name="geo.region" content="US-AL">
    <meta name="geo.placename" content="Huntsville, Alabama">
    <meta name="geo.position" content="34.7304;-86.5861">
    <!-- CollectionPage Schema -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "Personal Injury Law Blog — DeFatta Law Firm",
      "description": "Free legal guides and articles on personal injury law, wrongful death, nursing home abuse, car accidents, and civil rights from DeFatta Law Firm in Huntsville, Alabama.",
      "url": "https://www.defattalaw.com/resources",
      "publisher": {
        "@type": "LegalService",
        "name": "DeFatta Law Firm",
        "url": "https://www.defattalaw.com",
        "telephone": "+1-256-257-4674",
        "logo": { "@type": "ImageObject", "url": "https://www.defattalaw.com/defatta-law-logo.png" }
      },
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": ${posts.length},
        "itemListElement": [
        ${itemList}
        ]
      }
    }
    </script>
    <!-- Breadcrumb Schema -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.defattalaw.com/" },
        { "@type": "ListItem", "position": 2, "name": "Resources", "item": "https://www.defattalaw.com/resources" }
      ]
    }
    </script>
${SHARED_HEAD_LINKS}
    <style>
${SHARED_CSS}

        /* HERO */
        .page-hero { position: relative; min-height: 340px; background: url('Huntsville background.png') center 40% / cover no-repeat; display: flex; align-items: center; overflow: hidden; }
        .page-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(105deg, rgba(10,20,50,0.90) 0%, rgba(26,47,98,0.80) 50%, rgba(10,20,50,0.65) 100%); pointer-events: none; }
        .hero-content { position: relative; z-index: 1; max-width: 720px; padding: 60px 0; }
        .breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.6); }
        .breadcrumb a { color: rgba(255,255,255,0.6); transition: color 0.2s; }
        .breadcrumb a:hover { color: var(--white); }
        .breadcrumb-sep { opacity: 0.4; }
        .breadcrumb-current { color: rgba(255,255,255,0.9); }
        .hero-content h1 { font-size: clamp(2rem, 4vw, 3rem); color: var(--white); margin-bottom: 16px; font-weight: 700; }
        .hero-sub { font-size: 1.05rem; color: rgba(255,255,255,0.8); max-width: 560px; line-height: 1.7; }

        /* TRUST BAR */
        .trust-bar { background: var(--secondary); padding: 18px 0; }
        .trust-bar-inner { display: flex; justify-content: center; align-items: center; gap: 48px; flex-wrap: wrap; }
        .trust-item { display: flex; align-items: center; gap: 10px; color: var(--white); font-size: 13px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; }
        .trust-icon { width: 20px; height: 20px; fill: var(--white); flex-shrink: 0; }

        /* BLOG GRID */
        .blog-section { padding: 72px 0 96px; background: var(--light-gray); }
        .section-eyebrow { font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--secondary); font-weight: 700; margin-bottom: 10px; }
        .section-heading { font-size: clamp(1.6rem, 3vw, 2.4rem); color: var(--primary-dark); margin-bottom: 12px; }
        .section-subhead { color: var(--text-light); font-size: 1rem; max-width: 560px; line-height: 1.7; margin-bottom: 48px; }
        .posts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        .post-card { background: var(--white); border-radius: 6px; overflow: hidden; box-shadow: 0 2px 16px rgba(35,62,130,0.07); transition: box-shadow 0.2s, transform 0.2s; display: flex; flex-direction: column; }
        .post-card:hover { box-shadow: 0 8px 32px rgba(35,62,130,0.14); transform: translateY(-3px); }
        .post-card-img-wrap { display: block; overflow: hidden; height: 200px; }
        .post-card-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
        .post-card:hover .post-card-img-wrap img { transform: scale(1.04); }
        .post-card-img-placeholder { background: var(--gray); height: 200px; }
        .post-card-body { padding: 22px 24px 26px; display: flex; flex-direction: column; flex: 1; }
        .post-card-meta { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-light); font-weight: 700; margin-bottom: 10px; }
        .post-card-title { font-size: 1.05rem; color: var(--primary-dark); margin-bottom: 12px; line-height: 1.35; }
        .post-card-title a { color: inherit; transition: color 0.2s; }
        .post-card-title a:hover { color: var(--secondary); }
        .post-card-excerpt { font-size: 0.88rem; color: var(--text-light); line-height: 1.65; margin-bottom: 18px; flex: 1; }
        .post-card-link { font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--primary); transition: color 0.2s; }
        .post-card-link:hover { color: var(--secondary); }

        /* RESPONSIVE */
        @media (max-width: 900px) { .posts-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) {
            .top-bar { display: none; } .nav-links-wrap { display: none; } .nav-hamburger { display: flex; color: #233e82; }
            .trust-bar-inner { gap: 24px; }
            .footer-main { grid-template-columns: 1fr 1fr; }
            .footer-bottom-bar { flex-direction: column; gap: 8px; text-align: center; }
        }
        @media (max-width: 560px) { .posts-grid { grid-template-columns: 1fr; } .footer-main { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
${SHARED_TOPBAR_NAV(true)}

<section class="page-hero">
    <div class="container">
        <div class="hero-content">
            <div class="breadcrumb">
                <a href="index.html">Home</a>
                <span class="breadcrumb-sep">›</span>
                <span class="breadcrumb-current">Resources</span>
            </div>
            <h1>Legal Resources &amp;<br>Insights</h1>
            <p class="hero-sub">Helpful articles, legal guides, and news from DeFatta Law Firm — serving Huntsville and all of North Alabama.</p>
        </div>
    </div>
</section>

<div class="trust-bar">
    <div class="container">
        <div class="trust-bar-inner">
            <div class="trust-item"><svg class="trust-icon" viewBox="0 0 24 24"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg>15+ Years Experience</div>
            <div class="trust-item"><svg class="trust-icon" viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1C9.61 21 3 14.39 3 6a1 1 0 011-1h3.5a1 1 0 011 1c0 1.26.2 2.47.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z"/></svg>Available 24/7</div>
            <div class="trust-item"><svg class="trust-icon" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 15l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>No Fee Unless We Win</div>
            <div class="trust-item"><svg class="trust-icon" viewBox="0 0 24 24"><path d="M20 6h-4V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2zm-10-2h4v2h-4V4z"/></svg>Free Consultation</div>
        </div>
    </div>
</div>

<section class="blog-section">
    <div class="container">
        <div class="section-eyebrow">Legal Insights</div>
        <h2 class="section-heading">Articles &amp; Resources</h2>
        <p class="section-subhead">Stay informed with legal guidance from DeFatta Law Firm — ${posts.length} articles covering personal injury, wrongful death, civil rights, and more.</p>
        <div class="posts-grid">
${cards}
        </div>
    </div>
</section>

<section class="cta-section" id="contact">
    <div class="container">
        <h2>Have a Legal Question?<br>We're Here to Help.</h2>
        <p>Don't navigate your legal situation alone. Schedule a free, no-obligation consultation with attorney Phil DeFatta today.</p>
        <a href="tel:2562574674" class="cta-phone">256.257.4674</a>
        <a href="free-consultation.html" class="btn-white">Schedule Free Consultation</a>
    </div>
</section>

${SHARED_FOOTER}
</body>
</html>`;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
const csvPath = path.join(__dirname, 'code for resources');
const csvText = fs.readFileSync(csvPath, 'utf8');
const rows = parseCSV(csvText);

console.log('CSV columns:', rows[0].join(' | '));
console.log('Total rows (inc. header):', rows.length);

// Columns: 0=Name, 1=Slug, 2=CollectionID, 3=LocaleID, 4=ItemID,
//          5=Archived, 6=Draft, 7=CreatedOn, 8=UpdatedOn, 9=PublishedOn,
//          10=ShortDescription, 11=FullPostContent, 12=BlogPostImage, 13=WrittenBy
const posts = rows.slice(1)
  .filter(r => r.length >= 12 && r[5] !== 'true' && r[6] !== 'true')
  .map(r => ({
    title: r[0],
    slug: r[1],
    rawDate: r[9] || r[7],
    date: formatDate(r[9] || r[7]),
    excerpt: r[10],
    content: r[11],
    image: r[12],
    author: r[13]
  }))
  .filter(p => p.title && p.slug && p.content);

// Sort newest first
posts.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

console.log(`\nGenerating ${posts.length} blog posts...\n`);

let generated = 0;
for (const post of posts) {
  const filename = path.join(__dirname, `blog-${post.slug}.html`);
  fs.writeFileSync(filename, buildPostHTML(post), 'utf8');
  generated++;
  console.log(`  ✓ blog-${post.slug}.html`);
}

// Generate resources index
fs.writeFileSync(path.join(__dirname, 'resources.html'), buildResourcesHTML(posts), 'utf8');
console.log(`\n✓ resources.html`);
console.log(`\nAll done! Generated ${generated} blog posts + resources.html`);
