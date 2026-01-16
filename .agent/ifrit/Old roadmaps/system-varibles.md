WP Sites & Content Workflow Variables Audit
All variables used in website creation and content generation workflows, organized for future database modeling.

1. Website Creation Workflow
1.1 CreateWebsiteRequest (Entry Point)
Field	Type	Required	Description
domain	string	✅	Primary key - "example.com"
niche	string	✅	Topic area
siteConfig	Partial	✅	Site configuration
githubToken	string	✅	GitHub auth
vercelToken	string	✅	Vercel auth
generateEssentialPages	boolean	❌	Auto-create about/privacy/etc
useAIDecisions	boolean	❌	Use AI for styling decisions
1.2 SiteConfig
Field	Type	Required	Description
domain	string	✅	Primary identifier
siteName	string	✅	Display name
siteTagline	string	✅	Site tagline
niche	string	✅	Topic area
targetAudience	string	✅	Who the site serves
template	enum	❌	'niche-authority' | 'topical-magazine' | 'expert-hub'
author.name	string	✅	Author name
author.role	string	✅	Author title
author.experience	string	✅	Years/level
author.credentials	string[]	❌	Professional credentials
author.bio	string	❌	Full bio text
pillars	string[]	❌	Main topic pillars
clustersPerPillar	number	❌	Article count per pillar
includeAbout	boolean	❌	Generate about page
includeEssentialPages	boolean	❌	Generate privacy/terms/etc
includeHomepage	boolean	❌	Generate homepage content
1.3 Website (Stored Entity)
Field	Type	Required	Description
domain	string	✅	PK
name	string	✅	Display name
niche	string	✅	Topic
template.name	string	✅	Template ID
template.version	string	✅	Version number
template.upgradeAvailable	boolean	✅	Upgrade flag
stats.articlesCount	number	✅	Total articles
stats.totalWords	number	✅	Word count
stats.lastPublishedAt	number	❌	Unix timestamp
deployment.githubRepo	string	✅	Repo name
deployment.githubOwner	string	✅	GitHub username
deployment.vercelProject	string	❌	Vercel project ID
deployment.liveUrl	string	✅	Production URL
deployment.lastDeployedAt	number	❌	Unix timestamp
deployment.pendingChanges	number	✅	Unpublished articles
author.name	string	✅	Author name
author.role	string	✅	Author title
author.bio	string	❌	Bio text
status	enum	✅	'setup' | 'building' | 'active' | 'error'
createdAt	number	✅	Unix timestamp
updatedAt	number	✅	Unix timestamp
2. Content Generation Workflow
2.1 ContentRequest (Input)
Field	Type	Required	Description
type	ContentType	✅	'homepage' | 'pillar' | 'cluster' | 'about' | 'author'
topic	string	✅*	Required for pillar/cluster
keywords
string[]	❌	SEO keywords
parentPillar	string	❌	Parent article for clusters
categories	string[]	❌	For homepage sections
siteContext	SiteContext	✅	Site branding
2.2 SiteContext (Branding)
Field	Type	Required	Description
siteName	string	✅	Site name
tagline	string	✅	Tagline
niche	string	✅	Topic area
audience	string	✅	Target audience
voice	string	✅	Tone: professional/conversational
author.name	string	✅	Author name
author.role	string	✅	Title
author.experience	string	✅	Experience level
2.3 Article (Stored Entity)
Field	Type	Required	Description
id
string	✅	UUID
slug	string	✅	URL slug
title	string	✅	Title
description	string	✅	Meta description
content	string	✅	Markdown body
category	string	✅	Primary category
tags	string[]	✅	Tags
contentType	string	✅	'tofu' | 'tactical' | 'seasonal' | 'external'
pageType	enum	✅	'article' | 'structural' | 'homepage'
structuralType	enum	❌	'about' | 'contact' | 'privacy' | 'terms'
wordCount	number	✅	Word count
readingTime	number	✅	Minutes
eeatSignals	string[]	✅	E-E-A-T elements
aiOverviewBlocks	string[]	✅	AI overview snippets
aiGeneration.provider	string	❌	'gemini' | 'deepseek'
aiGeneration.model	string	❌	Model name
aiGeneration.generatedAt	number	❌	Unix timestamp
isExternal	boolean	✅	External content flag
source	enum	✅	'ai-generated' | 'external' | 'github-sync' | 'manual'
status	enum	✅	'draft' | 'ready' | 'published'
publishedAt	number	❌	Unix timestamp
lastModifiedAt	number	✅	Unix timestamp
metaTitle	string	❌	SEO title override
metaDescription	string	❌	SEO description override
canonicalUrl	string	❌	Canonical URL
3. Campaign Automation Workflow
3.1 Campaign (Stored Entity)
Field	Type	Required	Description
id
string	✅	UUID
name	string	✅	Campaign name
description	string	❌	Description
status	enum	✅	'active' | 'paused' | 'draft'
targetSiteId	string	✅	WP Site FK
targetCategoryId	number	❌	WP category ID
targetAuthorId	number	❌	WP author ID
postStatus	enum	✅	'publish' | 'draft' | 'pending'
3.2 CampaignSource
Field	Type	Required	Description
type	enum	✅	'keywords' | 'rss' | 'trends' | 'manual'
Keyword Config			
keywords
string[]	✅*	Keywords list
rotateMode	enum	✅*	'sequential' | 'random'
currentIndex	number	✅*	Current position
skipUsed	boolean	✅*	Skip used keywords
RSS Config			
feedUrls	string[]	✅*	Feed URLs
extractFullContent	boolean	✅*	Extract full text
aiRewrite	boolean	✅*	AI rewrite flag
filterKeywords	string[]	❌	Content filter
Trends Config			
region	string	✅*	Region code
category	string	❌	Trend category
minSearchVolume	number	❌	Minimum volume
Manual Config			
topics	ManualTopic[]	✅*	Topic list
3.3 AIConfig
Field	Type	Required	Description
provider	enum	✅	'gemini' | 'deepseek' | 'openrouter' | 'perplexity'
model	string	❌	Specific model
articleType	enum	✅	'pillar' | 'cluster' | 'how-to' | 'review' | 'listicle'
tone	enum	✅	'professional' | 'conversational' | 'authoritative' | 'friendly'
targetLength	number	✅	Target word count
useResearch	boolean	✅	Enable research
researchProvider	enum	❌	'perplexity' | 'google'
includeImages	boolean	✅	Generate images
imageProvider	enum	❌	'dalle' | 'gemini' | 'unsplash' | 'pexels'
imagePlacements	enum[]	❌	['cover', 'inline']
optimizeForSEO	boolean	✅	SEO optimization
includeSchema	boolean	✅	Schema markup
includeFAQ	boolean	✅	FAQ section
enableSpinner	boolean	❌	Content spinning
spinnerMode	enum	❌	'light' | 'moderate' | 'heavy'
3.4 ScheduleConfig
Field	Type	Required	Description
type	enum	✅	'manual' | 'interval' | 'cron'
intervalHours	number	❌	Hours between runs
cronExpression	string	❌	Cron format
maxPostsPerRun	number	✅	Limit per run
pauseOnError	boolean	✅	Stop on failure
lastRunAt	number	❌	Last run timestamp
nextRunAt	number	❌	Next scheduled run
4. WordPress Publishing Workflow
4.1 WPSite (Connection)
Field	Type	Required	Description
id
string	✅	UUID
name	string	✅	Display name
url	string	✅	Site URL
username	string	✅	WP username
appPassword	string	✅	Application password
status	enum	✅	'connected' | 'error' | 'pending'
lastError	string	❌	Error message
siteType	enum	❌	'authority' | 'affiliate' | 'magazine' | 'business'
theme.name	string	❌	Active theme
theme.version	string	❌	Theme version
theme.adsenseOptimized	boolean	❌	Ad-ready theme
plugins	WPPlugin[]	❌	Installed plugins
syncedAt	number	❌	Last sync timestamp
categories	WPCategory[]	❌	Synced categories
tags	WPTag[]	❌	Synced tags
authors	WPAuthor[]	❌	Synced authors
createdAt	number	✅	Created
updatedAt	number	✅	Updated
4.2 WPPostInput
Field	Type	Required	Description
title	string	✅	Post title
content	string	✅	HTML content
excerpt	string	❌	Excerpt
status	enum	✅	'publish' | 'draft' | 'pending' | 'private'
categories	number[]	❌	Category IDs
tags	number[]	❌	Tag IDs
author	number	❌	Author ID
featured_media	number	❌	Featured image ID
slug	string	❌	Custom slug
meta	Record	❌	Custom fields
5. Domain Profiling Workflow (Hunt Tab)
5.1 DomainProfileForAI
Field	Type	Required	Description
domain	string	✅	Domain name
niche	string	✅	Topic area
primaryKeywords	string[]	✅	Main keywords
secondaryKeywords	string[]	✅	Secondary keywords
questionKeywords	string[]	✅	FAQ keywords
suggestedTopics	string[]	✅	Content ideas
suggestedCategories	string[]	✅	Categories
competitorUrls	string[]	✅	Competitor sites
contentGaps	string[]	✅	Missing content
trafficPotential	number	✅	Traffic score (0-100)
difficultyScore	number	✅	Difficulty (0-100)
5.2 AISiteDecisions
Field	Type	Required	Description
template	AIDecision	✅	Template choice
homepageLayout	AIDecision	✅	Layout style
articleGridStyle	AIDecision	✅	Grid format
headerStyle	AIDecision	✅	Header design
footerStyle	AIDecision	✅	Footer design
cardStyle	AIDecision	✅	Card design
buttonStyle	AIDecision	✅	Button style
newsletterPlacement	AIDecision	✅	Newsletter position
adPlacements	AIDecision	✅	Ad positions
colorPalette	object	✅	Colors + mood
primaryColor	string	✅	Primary color
secondaryColor	string	✅	Secondary color
accentColor	string	❌	Accent color
backgroundColor	string	❌	Background
fontPairing	string	✅	Font combination
mood	string	❌	Design mood
overallStrategy	string	✅	Strategy summary
Summary: Variable Count
Workflow	Required Fields	Optional Fields	Total
Website Creation	22	14	36
Content Generation	15	12	27
Campaign Automation	28	18	46
WordPress Publishing	14	15	29
Domain Profiling	15	4	19
TOTAL	94	63	157
