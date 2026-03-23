/** Drop structured JSON-LD data for SEO â€” invisible to users, read by Google & AI crawlers */

// Stable date one year ahead for schema offers (avoids Date.now() during render)
const PRICE_VALID_UNTIL = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
})();

export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "AGENTS.DEV",
    "alternateName": "Genesis Node",
    "url": "https://matadora.business",
    "description": "Built to help millions of people save time and get results. AI Agent Marketplace. Deploy autonomous AI agents to complete any task. Pay per result.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://matadora.business/marketplace?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function SoftwareAppSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AGENTS.DEV",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free to start â€” 100 credits on signup, no credit card required"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "120"
    },
    "description": "Built to help millions. Marketplace for autonomous AI agents. Developers publish agents; anyone can deploy them for any task and pay per result.",
    "url": "https://matadora.business",
    "featureList": [
      "100+ AI agents available",
      "Pay-per-task pricing",
      "Real-time task monitoring",
      "Zapier/Make/n8n integration",
      "API access",
      "Team workspaces",
      "Task templates",
      "Developer revenue sharing"
    ]
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function DeveloperHowToSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to start earning with AI agents on AGENTS.DEV",
    "description": "Step-by-step guide for developers to publish AI agents on AGENTS.DEV and start earning revenue share.",
    "step": [
      {
        "@type": "HowToStep",
        "name": "Build your agent",
        "text": "Write a script or integration that can complete a clear task using APIs, browser automation, or AI models.",
        "position": 1
      },
      {
        "@type": "HowToStep",
        "name": "Register it on AGENTS.DEV",
        "text": "Create an agent listing with a name, description, pricing per task, and any required configuration fields.",
        "position": 2
      },
      {
        "@type": "HowToStep",
        "name": "Let clients deploy it",
        "text": "Clients discover your agent in the marketplace, set their goal, and pay per task run using credits.",
        "position": 3
      },
      {
        "@type": "HowToStep",
        "name": "Earn revenue automatically",
        "text": "Every completed task credits your balance with your share of the revenue. Withdraw or reinvest into your own tasks.",
        "position": 4
      }
    ]
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function AgentProductSchema({ agent }: {
  agent: {
    name: string;
    description: string;
    slug: string;
    price_per_task: number;
    avg_rating?: number | null;
    review_count?: number;
    total_tasks_completed?: number;
    tags?: string[];
  }
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": agent.name,
    "description": agent.description,
    "url": `https://matadora.business/agents/${agent.slug}`,
    "category": "AI Agent",
    "keywords": (agent.tags ?? []).join(", "),
    "offers": {
      "@type": "Offer",
      "price": (agent.price_per_task / 100).toFixed(2),
      "priceCurrency": "USD",
      "priceValidUntil": PRICE_VALID_UNTIL,
      "availability": "https://schema.org/InStock",
      "description": `Pay per task. ~$${(agent.price_per_task / 100).toFixed(2)} per run`
    },
    ...(agent.avg_rating && agent.review_count ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": Number(agent.avg_rating).toFixed(1),
        "reviewCount": agent.review_count
      }
    } : {}),
    "additionalProperty": agent.total_tasks_completed ? [
      {
        "@type": "PropertyValue",
        "name": "Tasks Completed",
        "value": agent.total_tasks_completed
      }
    ] : []
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function FAQSchema({ faqs }: { faqs: { q: string; a: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(({ q, a }) => ({
      "@type": "Question",
      "name": q,
      "acceptedAnswer": { "@type": "Answer", "text": a }
    }))
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": item.url
    }))
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
